const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const db = require('../config/database');

// Middleware to check if user is authority
const authorityMiddleware = (req, res, next) => {
  if (req.user.role !== 'authority') {
    return res.status(403).json({ error: 'Access denied. Authority role required.' });
  }
  next();
};

// Get dashboard stats
router.get('/stats/farms', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [farmsResult] = await db.query(`
      SELECT COUNT(*) as totalFarms FROM farms
    `);

    const [stateResult] = await db.query(`
      SELECT fr.state, COUNT(*) as count
      FROM farms f
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      WHERE fr.state IS NOT NULL AND fr.state != ''
      GROUP BY fr.state
      ORDER BY count DESC
    `);

    res.json({
      totalFarms: farmsResult[0].totalFarms,
      stateDistribution: stateResult.reduce((acc, row) => {
        acc[row.state] = row.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching farm stats:', error);
    res.status(500).json({ error: 'Failed to fetch farm statistics' });
  }
});

router.get('/stats/treatments', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [result] = await db.query(`
      SELECT COUNT(*) as totalTreatments FROM treatment_records
    `);
    res.json({ totalTreatments: result[0].totalTreatments });
  } catch (error) {
    console.error('Error fetching treatment stats:', error);
    res.status(500).json({ error: 'Failed to fetch treatment statistics' });
  }
});

router.get('/stats/amu', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [result] = await db.query(`
      SELECT COUNT(DISTINCT medicine) as totalAntibiotics
      FROM amu_records
      WHERE category_type = 'antibiotic'
    `);
    res.json({ totalAntibiotics: result[0].totalAntibiotics });
  } catch (error) {
    console.error('Error fetching AMU stats:', error);
    res.status(500).json({ error: 'Failed to fetch AMU statistics' });
  }
});

router.get('/stats/alerts', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [unsafeMRL] = await db.query(`
      SELECT COUNT(*) as unsafeMRLCases FROM amu_records WHERE risk_category = 'unsafe'
    `);

    const [highRisk] = await db.query(`
      SELECT COUNT(DISTINCT farm_id) as highRiskFarms
      FROM amu_records
      WHERE risk_category = 'unsafe' OR overdosage = true
    `);

    res.json({
      unsafeMRLCases: unsafeMRL[0].unsafeMRLCases,
      highRiskFarms: highRisk[0].highRiskFarms
    });
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({ error: 'Failed to fetch alert statistics' });
  }
});

router.get('/stats/veterinarians', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [result] = await db.query(`
      SELECT COUNT(*) as activeVets FROM veterinarians
    `);
    res.json({ activeVets: result[0].activeVets });
  } catch (error) {
    console.error('Error fetching vet stats:', error);
    res.status(500).json({ error: 'Failed to fetch veterinarian statistics' });
  }
});

// AMU Analytics data
router.get('/amu-analytics', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const { period = 30 } = req.query; // days

    // AMU usage per species
    const [speciesUsage] = await db.query(`
      SELECT species, COUNT(*) as count
      FROM amu_records
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY species
      ORDER BY count DESC
    `, [period]);

    // Top 10 medicines
    const [topMedicines] = await db.query(`
      SELECT medicine, COUNT(*) as usage_count
      FROM amu_records
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY medicine
      ORDER BY usage_count DESC
      LIMIT 10
    `, [period]);

    // Risk category distribution
    const [riskDistribution] = await db.query(`
      SELECT risk_category, COUNT(*) as count
      FROM amu_records
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY risk_category
    `, [period]);

    // Overdosage count
    const [overdosageCount] = await db.query(`
      SELECT COUNT(*) as count
      FROM amu_records
      WHERE overdosage = true AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [period]);

    // Monthly trends (last 6 months)
    const [monthlyTrends] = await db.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
      FROM amu_records
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
    `);

    res.json({
      antibioticUsageBySpecies: speciesUsage,
      topMedicines,
      riskDistribution: riskDistribution.reduce((acc, row) => {
        acc[row.risk_category ? row.risk_category.toLowerCase() : 'unknown'] = row.count;
        return acc;
      }, { safe: 0, borderline: 0, unsafe: 0 }),
      overdosageEvents: overdosageCount[0].count,
      monthlyTrends,
      stateWiseUsage: [],
      treatmentTrends: monthlyTrends // Use monthly trends as treatment trends
    });
  } catch (error) {
    console.error('Error fetching AMU analytics:', error);
    res.status(500).json({ error: 'Failed to fetch AMU analytics' });
  }
});

// Detailed AMU records for flashcards
router.get('/amu-records', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0, species, state, district, taluk, risk_category, sort_by = 'created_at', sort_order = 'DESC' } = req.query;

    let query = `
      SELECT
        a.amu_id,
        a.species,
        a.medicine,
        a.category_type,
        a.dose_amount,
        a.dose_unit,
        a.route,
        a.frequency_per_day,
        a.duration_days,
        a.start_date,
        a.end_date,
        a.predicted_withdrawal_days,
        a.safe_date,
        a.predicted_mrl,
        a.risk_percent,
        a.risk_category,
        a.matrix,
        a.created_at,
        f.farm_name,
        f.farm_id,
        u.display_name as farmer_name,
        fr.state,
        fr.district,
        fr.taluk,
        COALESCE(tr.vet_name, 'Unknown') as veterinarian_name
      FROM amu_records a
      LEFT JOIN treatment_records tr ON a.treatment_id = tr.treatment_id
      LEFT JOIN farms f ON a.farm_id = f.farm_id
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN users u ON fr.user_id = u.user_id
      WHERE 1=1
    `;

    const params = [];

    // Apply filters
    if (species) {
      query += ' AND a.species = ?';
      params.push(species);
    }

    if (state) {
      query += ' AND fr.state = ?';
      params.push(state);
    }

    if (district) {
      query += ' AND fr.district = ?';
      params.push(district);
    }

    if (taluk) {
      query += ' AND fr.taluk = ?';
      params.push(taluk);
    }

    if (risk_category) {
      query += ' AND a.risk_category = ?';
      params.push(risk_category);
    }

    // Sorting
    const validSortFields = ['created_at', 'species', 'medicine', 'risk_category', 'farm_name'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY a.${sortField} ${sortDir}`;

    // Pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [records] = await db.query(query, params);

    // Format the records for flashcards
    const formattedRecords = records.map(record => ({
      amu_id: record.amu_id,
      species: record.species,
      medicine: record.medicine,
      category_type: record.category_type,
      dosage: {
        amount: record.dose_amount,
        unit: record.dose_unit,
        route: record.route,
        frequency_per_day: record.frequency_per_day,
        duration_days: record.duration_days
      },
      farmer_name: record.farmer_name || 'Unknown',
      farm_name: record.farm_name || 'Unknown Farm',
      farm_id: record.farm_id,
      location: {
        state: record.state,
        district: record.district,
        taluk: record.taluk
      },
      dates: {
        start_date: record.start_date,
        end_date: record.end_date
      },
      withdrawal: {
        predicted_withdrawal_days: record.predicted_withdrawal_days,
        safe_date: record.safe_date
      },
      risk: {
        predicted_mrl: record.predicted_mrl,
        risk_percent: record.risk_percent,
        risk_category: record.risk_category ? record.risk_category.charAt(0).toUpperCase() + record.risk_category.slice(1).toLowerCase() : 'Unknown'
      },
      matrix: record.matrix,
      veterinarian_name: record.veterinarian_name || 'Unknown',
      created_at: record.created_at
    }));

    res.json({
      records: formattedRecords,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: records.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching AMU records:', error);
    res.status(500).json({ error: 'Failed to fetch AMU records' });
  }
});

// Complaints & Alerts
router.get('/complaints', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const { state, species, severity } = req.query;

    let query = `
      SELECT n.*, f.farm_name, f.farm_id, fr.state, fr.district, a.species, a.medicine, a.risk_category,
             t.vet_name, t.vet_id, a.predicted_mrl as residual_value
      FROM notification_history n
      LEFT JOIN amu_records a ON n.amu_id = a.amu_id
      LEFT JOIN treatment_records t ON a.treatment_id = t.treatment_id
      LEFT JOIN farms f ON a.farm_id = f.farm_id
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      WHERE n.subtype IN ('unsafe_mrl', 'high_dosage', 'overdosage')
    `;

    const params = [];

    if (state) {
      query += ' AND fr.state = ?';
      params.push(state);
    }

    if (species) {
      query += ' AND a.species = ?';
      params.push(species);
    }

    query += ' ORDER BY n.created_at DESC LIMIT 100';

    const [complaints] = await db.query(query, params);
    res.json(complaints);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

router.patch('/complaints/:id/review', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // Mark as reviewed - update is_read field
    await db.query('UPDATE notification_history SET is_read = ? WHERE notification_id = ?', [true, id]);
    res.json({ message: 'Complaint marked as reviewed' });
  } catch (error) {
    console.error('Error marking complaint as reviewed:', error);
    res.status(500).json({ error: 'Failed to mark as reviewed' });
  }
});

// Heat map data
router.get('/heat-map', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [heatData] = await db.query(`
      SELECT f.latitude, f.longitude, COUNT(a.amu_id) as intensity,
             AVG(CASE WHEN a.risk_category = 'unsafe' THEN 1 ELSE 0 END) as unsafe_ratio
      FROM farms f
      LEFT JOIN amu_records a ON f.farm_id = a.farm_id
      WHERE f.latitude IS NOT NULL AND f.longitude IS NOT NULL
      GROUP BY f.latitude, f.longitude
      HAVING intensity > 0
    `);

    res.json(heatData.map(item => ({
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude),
      intensity: item.intensity
    })));
  } catch (error) {
    console.error('Error fetching heat map data:', error);
    res.status(500).json({ error: 'Failed to fetch heat map data' });
  }
});

// Map view data
router.get('/map-view', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const { species, state, district, risk_type } = req.query;

    let query = `
      SELECT f.farm_id, f.farm_name, f.latitude, f.longitude, fr.state, fr.district,
             COALESCE(amu_stats.amu_count, 0) as amu_count,
             COALESCE(amu_stats.unsafe_count, 0) as unsafe_count,
             COALESCE(amu_stats.risk_category, 'safe') as risk_category
      FROM farms f
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN (
        SELECT farm_id,
               COUNT(*) as amu_count,
               SUM(CASE WHEN risk_category = 'unsafe' THEN 1 ELSE 0 END) as unsafe_count,
               CASE
                 WHEN SUM(CASE WHEN risk_category = 'unsafe' THEN 1 ELSE 0 END) > 0 THEN 'unsafe'
                 WHEN SUM(CASE WHEN risk_category = 'borderline' THEN 1 ELSE 0 END) > 0 THEN 'borderline'
                 ELSE 'safe'
               END as risk_category
        FROM amu_records
        GROUP BY farm_id
      ) amu_stats ON f.farm_id = amu_stats.farm_id
      WHERE f.latitude IS NOT NULL AND f.longitude IS NOT NULL
    `;

    const params = [];

    // Apply filters only if they exist - these filter the farms, not the AMU records
    if (state) {
      query += ' AND fr.state = ?';
      params.push(state);
    }

    if (district) {
      // Handle partial district name matching (e.g., "Bangalore" should match "Bangalore Urban" and "Bangalore Rural")
      query += ' AND fr.district LIKE ?';
      params.push(`%${district}%`);
    }

    // For species and risk_type, we need to filter farms that have AMU records matching these criteria
    if (species || risk_type) {
      query += ' AND EXISTS (SELECT 1 FROM amu_records a WHERE a.farm_id = f.farm_id';
      if (species) {
        query += ' AND a.species = ?';
        params.push(species);
      }
      if (risk_type) {
        query += ' AND a.risk_category = ?';
        params.push(risk_type);
      }
      query += ')';
    }

    const [farms] = await db.query(query, params);
    res.json(farms);
  } catch (error) {
    console.error('Error fetching map view data:', error);
    res.status(500).json({ error: 'Failed to fetch map view data' });
  }
});

// Farm details for map marker click
router.get('/farm/:farm_id', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const { farm_id } = req.params;

    const [farmResult] = await db.query(`
      SELECT f.*, COUNT(a.amu_id) as total_amu,
             SUM(CASE WHEN a.risk_category = 'unsafe' THEN 1 ELSE 0 END) as unsafe_amu
      FROM farms f
      LEFT JOIN amu_records a ON f.farm_id = a.farm_id
      WHERE f.farm_id = ?
      GROUP BY f.farm_id
    `, [farm_id]);

    if (farmResult.length === 0) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    const [amuSummary] = await db.query(`
      SELECT medicine, COUNT(*) as count, risk_category
      FROM amu_records
      WHERE farm_id = ?
      GROUP BY medicine, risk_category
      ORDER BY count DESC
      LIMIT 10
    `, [farm_id]);

    res.json({
      farm: farmResult[0],
      amuSummary
    });
  } catch (error) {
    console.error('Error fetching farm details:', error);
    res.status(500).json({ error: 'Failed to fetch farm details' });
  }
});

// Profile management
router.get('/profile', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [profile] = await db.query(`
      SELECT u.*, ap.department, ap.designation, ap.phone
      FROM users u
      LEFT JOIN authority_profiles ap ON u.user_id = ap.user_id
      WHERE u.user_id = ?
    `, [req.user.user_id]);

    if (profile.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const { display_name, phone, department } = req.body;

    await db.query(`
      UPDATE users
      SET display_name = ?
      WHERE user_id = ?
    `, [display_name, req.user.user_id]);

    // Update or insert authority profile
    await db.query(`
      INSERT INTO authority_profiles (user_id, phone, department)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE phone = VALUES(phone), department = VALUES(department)
    `, [req.user.user_id, phone, department]);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/profile/password', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // For simplicity, assuming password is stored as plain text (not recommended in production)
    // In real app, use bcrypt
    const [user] = await db.query('SELECT password_hash FROM users WHERE user_id = ?', [req.user.user_id]);

    if (user[0].password_hash !== currentPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    await db.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [newPassword, req.user.user_id]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Reports
router.get('/reports/generate', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    let data = {};

    switch (type) {
      case 'amu_monthly':
        const [treatments] = await db.query(`
          SELECT COUNT(*) as totalTreatments FROM treatment_records
          WHERE created_at BETWEEN ? AND ?
        `, [startDate, endDate]);

        const [antibiotics] = await db.query(`
          SELECT SUM(dose_amount) as totalAntibiotics FROM amu_records
          WHERE created_at BETWEEN ? AND ?
        `, [startDate, endDate]);

        const [violations] = await db.query(`
          SELECT COUNT(*) as mrlViolations FROM amu_records
          WHERE risk_category = 'unsafe' AND created_at BETWEEN ? AND ?
        `, [startDate, endDate]);

        const [speciesUsage] = await db.query(`
          SELECT species, COUNT(*) as count FROM amu_records
          WHERE created_at BETWEEN ? AND ?
          GROUP BY species
          ORDER BY count DESC
        `, [startDate, endDate]);

        data = {
          totalTreatments: treatments[0].totalTreatments,
          totalAntibiotics: antibiotics[0].totalAntibiotics || 0,
          mrlViolations: violations[0].mrlViolations,
          speciesUsage
        };
        break;

      case 'mrl_violations':
        const [violationsList] = await db.query(`
          SELECT a.*, f.farm_name FROM amu_records a
          JOIN farms f ON a.farm_id = f.farm_id
          WHERE a.risk_category = 'unsafe' AND a.created_at BETWEEN ? AND ?
          ORDER BY a.created_at DESC
        `, [startDate, endDate]);

        data = { violations: violationsList };
        break;

      case 'state_trends':
        const [stateTrends] = await db.query(`
          SELECT fr.state, COUNT(a.amu_id) as treatments,
                 SUM(a.dose_amount) as antibiotics, COUNT(CASE WHEN a.risk_category = 'unsafe' THEN 1 END) as violations
          FROM farms f
          LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
          LEFT JOIN amu_records a ON f.farm_id = a.farm_id AND a.created_at BETWEEN ? AND ?
          GROUP BY fr.state
          ORDER BY treatments DESC
        `, [startDate, endDate]);

        data = { stateTrends };
        break;

      case 'vet_activity':
        const [vetActivity] = await db.query(`
          SELECT v.vet_name as name, COUNT(a.amu_id) as totalTreatments,
                 COUNT(DISTINCT a.species) as speciesCount,
                 COUNT(DISTINCT a.farm_id) as farmsCount,
                 COUNT(CASE WHEN a.risk_category = 'unsafe' THEN 1 END) as violations
          FROM veterinarians v
          LEFT JOIN amu_records a ON v.vet_id = a.vet_id AND a.created_at BETWEEN ? AND ?
          GROUP BY v.vet_id, v.vet_name
          ORDER BY totalTreatments DESC
        `, [startDate, endDate]);

        data = { vetActivity };
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// PDF Export (placeholder - would need jsPDF or similar)
router.get('/reports/:type', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate, format = 'pdf' } = req.query;

    if (format !== 'pdf') {
      return res.status(400).json({ error: 'Only PDF format is supported' });
    }

    // For now, return JSON - frontend can generate PDF
    const response = await db.query('SELECT 1 as placeholder'); // Placeholder

    res.json({ message: 'PDF generation would happen here', type, startDate, endDate });
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

module.exports = router;