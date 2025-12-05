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
      SELECT u.state, COUNT(*) as count
      FROM farms f
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN users u ON fr.user_id = u.user_id
      WHERE u.state IS NOT NULL AND u.state != ''
      GROUP BY u.state
      ORDER BY count DESC
    `);

    res.json({
      totalFarms: farmsResult[0]?.totalFarms || 0,
      stateDistribution: (stateResult || []).reduce((acc, row) => {
        if (row.state) {
          acc[row.state] = row.count;
        }
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching farm stats:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Failed to fetch farm statistics', details: error.message });
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
        u.state,
        u.district,
        u.taluk,
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
      query += ' AND u.state = ?';
      params.push(state);
    }

    if (district) {
      query += ' AND u.district = ?';
      params.push(district);
    }

    if (taluk) {
      query += ' AND u.taluk = ?';
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
    const { state, species, severity, limit = 100 } = req.query;

    let query = `
      SELECT n.*, 
             f.farm_name, 
             f.farm_id, 
             u.state, 
             u.district, 
             a.species, 
             a.medicine, 
             a.risk_category,
             t.vet_name, 
             t.vet_id, 
             a.predicted_mrl as residual_value
      FROM notification_history n
      LEFT JOIN amu_records a ON n.amu_id = a.amu_id
      LEFT JOIN treatment_records t ON a.treatment_id = t.treatment_id
      LEFT JOIN farms f ON a.farm_id = f.farm_id
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN users u ON fr.user_id = u.user_id
      WHERE n.subtype IN ('unsafe_mrl', 'high_dosage', 'overdosage')
    `;

    const params = [];

    if (state) {
      query += ' AND u.state = ?';
      params.push(state);
    }

    if (species) {
      query += ' AND a.species = ?';
      params.push(species);
    }

    query += ` ORDER BY n.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [complaints] = await db.query(query, params);
    res.json(complaints || []);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch complaints', details: error.message });
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
      SELECT f.farm_id, f.farm_name, f.latitude, f.longitude, u.state, u.district,
             COALESCE(amu_stats.amu_count, 0) as amu_count,
             COALESCE(amu_stats.unsafe_count, 0) as unsafe_count,
             COALESCE(amu_stats.risk_category, 'safe') as risk_category
      FROM farms f
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN users u ON fr.user_id = u.user_id
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
      query += ' AND u.state = ?';
      params.push(state);
    }

    if (district) {
      // Handle partial district name matching (e.g., "Bangalore" should match "Bangalore Urban" and "Bangalore Rural")
      query += ' AND u.district LIKE ?';
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
      SELECT u.*, ap.department, ap.designation, ap.phone, ap.state, ap.district, ap.taluk
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
    const { display_name, phone, department, designation, state, district, taluk } = req.body;

    await db.query(`
      UPDATE users
      SET display_name = ?
      WHERE user_id = ?
    `, [display_name, req.user.user_id]);

    // Update or insert authority profile with location fields
    await db.query(`
      INSERT INTO authority_profiles (user_id, phone, department, designation, state, district, taluk)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        phone = VALUES(phone), 
        department = VALUES(department),
        designation = VALUES(designation),
        state = VALUES(state),
        district = VALUES(district),
        taluk = VALUES(taluk)
    `, [req.user.user_id, phone, department, designation, state, district, taluk]);

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
          SELECT u.state, COUNT(a.amu_id) as treatments,
                 SUM(a.dose_amount) as antibiotics, COUNT(CASE WHEN a.risk_category = 'unsafe' THEN 1 END) as violations
          FROM farms f
          LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
          LEFT JOIN users u ON fr.user_id = u.user_id
          LEFT JOIN amu_records a ON f.farm_id = a.farm_id AND a.created_at BETWEEN ? AND ?
          GROUP BY u.state
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

// ==================== DISEASE INTELLIGENCE HUB ENDPOINTS ====================

// Disease Clusters - K-means style clustering based on geo-location and disease patterns
router.get('/intelligence/disease-clusters', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [clusters] = await db.query(`
      SELECT 
        u.district,
        u.state,
        a.species,
        COUNT(DISTINCT f.farm_id) as farm_count,
        COUNT(a.amu_id) as case_count,
        AVG(f.latitude) as center_lat,
        AVG(f.longitude) as center_lng,
        CASE 
          WHEN SUM(CASE WHEN a.risk_category = 'unsafe' THEN 1 ELSE 0 END) > COUNT(*) * 0.3 THEN 'unsafe'
          WHEN SUM(CASE WHEN a.risk_category = 'borderline' THEN 1 ELSE 0 END) > COUNT(*) * 0.3 THEN 'borderline'
          ELSE 'safe'
        END as severity_level
      FROM amu_records a
      JOIN farms f ON a.farm_id = f.farm_id
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      JOIN users u ON fr.user_id = u.user_id
      WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
        AND f.latitude IS NOT NULL 
        AND f.longitude IS NOT NULL
      GROUP BY u.district, u.state, a.species
      HAVING farm_count >= 2
      ORDER BY case_count DESC
      LIMIT 20
    `);

    res.json(clusters);
  } catch (error) {
    console.error('Error fetching disease clusters:', error);
    res.status(500).json({ error: 'Failed to fetch disease clusters' });
  }
});

// Medication Usage & Risk Insights
router.get('/intelligence/medication-usage', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [medications] = await db.query(`
      SELECT 
        medicine,
        category_type,
        COUNT(*) as usage_count,
        AVG(risk_percent) as avg_risk_percent,
        CASE 
          WHEN AVG(risk_percent) >= 70 THEN 'unsafe'
          WHEN AVG(risk_percent) >= 40 THEN 'borderline'
          ELSE 'safe'
        END as risk_category,
        COUNT(CASE WHEN overdosage = true THEN 1 END) as overdosage_count
      FROM amu_records
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
        AND category_type = 'antibiotic'
      GROUP BY medicine, category_type
      ORDER BY usage_count DESC
      LIMIT 15
    `);

    res.json(medications);
  } catch (error) {
    console.error('Error fetching medication usage:', error);
    res.status(500).json({ error: 'Failed to fetch medication usage' });
  }
});

// Root Cause Analysis
router.get('/intelligence/root-causes', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [causes] = await db.query(`
      SELECT 
        tr.cause,
        COUNT(*) as case_count,
        GROUP_CONCAT(DISTINCT a.species SEPARATOR ', ') as species_list,
        (SELECT a2.species FROM amu_records a2 
         JOIN treatment_records tr2 ON a2.treatment_id = tr2.treatment_id 
         WHERE tr2.cause = tr.cause 
         GROUP BY a2.species 
         ORDER BY COUNT(*) DESC 
         LIMIT 1) as primary_species,
        (SELECT u.district FROM farmers fr 
         JOIN users u ON fr.user_id = u.user_id
         JOIN farms f ON fr.farmer_id = f.farmer_id
         JOIN amu_records a3 ON f.farm_id = a3.farm_id
         JOIN treatment_records tr3 ON a3.treatment_id = tr3.treatment_id
         WHERE tr3.cause = tr.cause 
         GROUP BY u.district 
         ORDER BY COUNT(*) DESC 
         LIMIT 1) as top_district
      FROM treatment_records tr
      JOIN amu_records a ON tr.treatment_id = a.treatment_id
      WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
        AND tr.cause IS NOT NULL
        AND tr.cause != ''
      GROUP BY tr.cause
      ORDER BY case_count DESC
      LIMIT 10
    `);

    res.json(causes);
  } catch (error) {
    console.error('Error fetching root causes:', error);
    console.error('Error details:', error.message);
    console.error('SQL:', error.sql);
    res.status(500).json({ error: 'Failed to fetch root causes', details: error.message });
  }
});

// Withdrawal Compliance Violations
router.get('/intelligence/withdrawal-violations', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [violations] = await db.query(`
      SELECT 
        u.district,
        u.state,
        COUNT(CASE WHEN a.safe_date > CURDATE() AND dv.verification_status = 'accepted' AND dv.is_withdrawal_safe = FALSE THEN 1 END) as violation_count,
        COUNT(DISTINCT f.farm_id) as affected_farms,
        CASE 
          WHEN COUNT(CASE WHEN a.safe_date > CURDATE() AND dv.verification_status = 'accepted' AND dv.is_withdrawal_safe = FALSE THEN 1 END) >= 10 THEN 'critical'
          WHEN COUNT(CASE WHEN a.safe_date > CURDATE() AND dv.verification_status = 'accepted' AND dv.is_withdrawal_safe = FALSE THEN 1 END) >= 5 THEN 'warning'
          ELSE 'normal'
        END as status
      FROM amu_records a
      JOIN animals_or_batches e ON a.entity_id = e.entity_id
      LEFT JOIN distributor_verification_logs dv ON e.entity_id = dv.entity_id
      JOIN farms f ON a.farm_id = f.farm_id
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      JOIN users u ON fr.user_id = u.user_id
      WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
      GROUP BY u.district, u.state
      HAVING violation_count > 0
      ORDER BY violation_count DESC
      LIMIT 15
    `);

    res.json(violations);
  } catch (error) {
    console.error('Error fetching withdrawal violations:', error);
    console.error('Error details:', error.message);
    console.error('SQL:', error.sql);
    res.status(500).json({ error: 'Failed to fetch withdrawal violations', details: error.message });
  }
});

// AMR Risk Radar
router.get('/intelligence/amr-risks', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [riskData] = await db.query(`
      SELECT 
        AVG(risk_percent) as avg_risk_percent,
        COUNT(CASE WHEN overdosage = true THEN 1 END) as overdosage_count,
        (SELECT worst_tissue FROM amu_records 
         WHERE worst_tissue IS NOT NULL 
         GROUP BY worst_tissue 
         ORDER BY COUNT(*) DESC 
         LIMIT 1) as worst_tissue,
        AVG(predicted_mrl) as avg_predicted_mrl,
        COUNT(CASE WHEN risk_category = 'unsafe' THEN 1 END) as unsafe_count,
        COUNT(*) as total_records
      FROM amu_records
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
    `);

    res.json(riskData[0] || {});
  } catch (error) {
    console.error('Error fetching AMR risks:', error);
    res.status(500).json({ error: 'Failed to fetch AMR risks' });
  }
});

// Monthly Disease Forecast
router.get('/intelligence/disease-forecast', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [forecast] = await db.query(`
      SELECT 
        DATE_FORMAT(a.created_at, '%Y-%m') as month,
        COUNT(*) as case_count,
        COUNT(DISTINCT a.species) as species_diversity,
        AVG(a.risk_percent) as avg_risk
      FROM treatment_records tr
      JOIN amu_records a ON tr.treatment_id = a.treatment_id
      WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(a.created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    // Add trend indicators
    const forecastWithTrends = forecast.map((item, idx) => {
      if (idx === 0) return { ...item, trend: 'stable' };
      
      const prevCount = forecast[idx - 1].case_count;
      const currentCount = item.case_count;
      const changePercent = ((currentCount - prevCount) / prevCount) * 100;
      
      return {
        ...item,
        trend: changePercent > 10 ? 'increasing' : changePercent < -10 ? 'decreasing' : 'stable'
      };
    });

    res.json(forecastWithTrends);
  } catch (error) {
    console.error('Error fetching disease forecast:', error);
    console.error('Error details:', error.message);
    console.error('SQL:', error.sql);
    res.status(500).json({ error: 'Failed to fetch disease forecast', details: error.message });
  }
});

// Get detailed farms list
router.get('/farms-list', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [farms] = await db.query(`
      SELECT 
        f.farm_id,
        f.farm_name,
        f.latitude,
        f.longitude,
        u.display_name as farmer_name,
        u.phone,
        u.state,
        u.district,
        u.taluk,
        COUNT(DISTINCT e.entity_id) as animal_count,
        (SELECT risk_category 
         FROM amu_records 
         WHERE farm_id = f.farm_id 
         ORDER BY created_at DESC 
         LIMIT 1) as risk_level
      FROM farms f
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      JOIN users u ON fr.user_id = u.user_id
      LEFT JOIN animals_or_batches e ON f.farm_id = e.farm_id
      GROUP BY f.farm_id, f.farm_name, f.latitude, f.longitude, 
               u.display_name, u.phone, u.state, u.district, u.taluk
      ORDER BY f.farm_name ASC
    `);

    res.json(farms);
  } catch (error) {
    console.error('Error fetching farms list:', error);
    res.status(500).json({ error: 'Failed to fetch farms list', details: error.message });
  }
});

// Get detailed vets list
router.get('/vets-list', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [vets] = await db.query(`
      SELECT 
        v.vet_id,
        v.vet_name,
        v.license_number,
        v.phone,
        u.state,
        u.district,
        COUNT(DISTINCT vfm.farm_id) as assigned_farms,
        COUNT(DISTINCT tr.treatment_id) as total_treatments
      FROM veterinarians v
      JOIN users u ON v.user_id = u.user_id
      LEFT JOIN vet_farm_mapping vfm ON v.vet_id = vfm.vet_id
      LEFT JOIN treatment_records tr ON v.vet_id = tr.vet_id
      GROUP BY v.vet_id, v.vet_name, v.license_number, v.phone, u.state, u.district
      ORDER BY v.vet_name ASC
    `);

    res.json(vets);
  } catch (error) {
    console.error('Error fetching vets list:', error);
    res.status(500).json({ error: 'Failed to fetch vets list', details: error.message });
  }
});

// Generate Treatment Report PDF
router.get('/reports/treatments', authMiddleware, authorityMiddleware, async (req, res) => {
  let docStarted = false;
  
  try {
    const { fromDate, toDate, species, state, district, taluk, medicine_category } = req.query;
    
    console.log('📄 Treatment report request:', { fromDate, toDate, species, state, district, taluk, medicine_category });
    
    // Validate dates
    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'fromDate and toDate are required' });
    }

    // Build query with filters
    let whereConditions = [`(tr.start_date BETWEEN ? AND ? OR tr.end_date BETWEEN ? AND ?)`];
    let queryParams = [fromDate, toDate, fromDate, toDate];

    if (species) {
      whereConditions.push('a.species = ?');
      queryParams.push(species);
    }
    if (state) {
      whereConditions.push('u.state = ?');
      queryParams.push(state);
    }
    if (district) {
      whereConditions.push('u.district = ?');
      queryParams.push(district);
    }
    if (taluk) {
      whereConditions.push('u.taluk = ?');
      queryParams.push(taluk);
    }
    if (medicine_category) {
      whereConditions.push('amu.category_type = ?');
      queryParams.push(medicine_category);
    }

    const whereClause = whereConditions.join(' AND ');

    console.log('🔍 Fetching treatment data with query...');
    
    // Fetch comprehensive treatment data
    const [treatments] = await db.query(`
      SELECT 
        tr.treatment_id,
        tr.medicine,
        tr.route,
        tr.dose_amount,
        tr.dose_unit,
        tr.frequency_per_day,
        tr.duration_days,
        tr.start_date,
        tr.end_date,
        tr.reason,
        tr.diagnosis,
        tr.cause,
        tr.vet_name,
        
        u.display_name as farmer_name,
        u.aadhaar_number,
        u.phone as farmer_phone,
        u.state,
        u.district,
        u.taluk,
        
        f.farm_name,
        f.latitude,
        f.longitude,
        
        e.entity_type,
        e.species,
        e.tag_id,
        e.batch_name,
        e.matrix,
        
        amu.amu_id,
        amu.active_ingredient,
        amu.category_type,
        amu.predicted_mrl,
        amu.predicted_withdrawal_days,
        amu.safe_date,
        amu.risk_percent,
        amu.risk_category,
        amu.worst_tissue,
        amu.overdosage,
        
        CASE 
          WHEN amu.safe_date IS NULL THEN 'Unknown'
          WHEN CURDATE() >= amu.safe_date THEN 'Safe for Sale'
          ELSE CONCAT('Not Safe - Wait ', DATEDIFF(amu.safe_date, CURDATE()), ' days')
        END as current_safety_status
        
      FROM treatment_records tr
      LEFT JOIN amu_records amu ON tr.treatment_id = amu.treatment_id
      LEFT JOIN animals_or_batches e ON tr.entity_id = e.entity_id
      LEFT JOIN farms f ON tr.farm_id = f.farm_id
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN users u ON fr.user_id = u.user_id
      WHERE ${whereClause}
      ORDER BY tr.start_date DESC, tr.treatment_id DESC
    `, queryParams);

    console.log(`✅ Found ${treatments.length} treatments`);

    // Check if no treatments found
    if (treatments.length === 0) {
      return res.status(404).json({ 
        error: 'No treatments found', 
        message: 'No treatment records match the selected filters and date range.' 
      });
    }

    // Fetch distributor verification logs for these treatments
    const treatmentIds = treatments.map(t => t.treatment_id);
    let distributorLogs = [];
    
    if (treatmentIds.length > 0) {
      try {
        const placeholders = treatmentIds.map(() => '?').join(',');
        const [logs] = await db.query(`
          SELECT 
            dvl.qr_id,
            dvl.verification_status,
            dvl.reason,
            dvl.scanned_at,
            d.distributor_name,
            d.company_name,
            amu.treatment_id
          FROM distributor_verification_logs dvl
          JOIN distributors d ON dvl.distributor_id = d.distributor_id
          JOIN amu_records amu ON dvl.entity_id = amu.entity_id
          WHERE amu.treatment_id IN (${placeholders})
          ORDER BY dvl.scanned_at DESC
        `, treatmentIds);
        distributorLogs = logs;
        console.log(`📋 Found ${distributorLogs.length} distributor logs`);
      } catch (logError) {
        console.warn('⚠️ Could not fetch distributor logs:', logError.message);
        // Continue without distributor logs
      }
    }

    console.log('📝 Generating PDF...');

    // Generate PDF
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true
    });

    // Set response headers
    const filename = `AMU_Report_${state || 'National'}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe to response
    doc.pipe(res);
    docStarted = true;

    // Generate PDF content
    generatePDFReport(doc, treatments, distributorLogs, { fromDate, toDate, species, state, district, taluk, medicine_category }, req.user);

    doc.end();
    console.log('✅ PDF generated successfully');

  } catch (error) {
    console.error('❌ Error generating treatment report:', error);
    console.error('Error stack:', error.stack);
    
    if (!docStarted && !res.headersSent) {
      res.status(500).json({ error: 'Failed to generate report', details: error.message });
    } else {
      // If PDF generation started, we can't send JSON, just end the response
      console.error('PDF generation failed after streaming started');
    }
  }
});

// PDF Generation Helper Function
function generatePDFReport(doc, treatments, distributorLogs, filters, authorityUser) {
  try {
    const pageWidth = doc.page.width - 100; // Account for margins
    
    // Header - Government Style
    doc.rect(0, 0, doc.page.width, 80).fill('#16a34a');
  
  doc.fillColor('#ffffff')
     .fontSize(20)
     .font('Helvetica-Bold')
     .text('DEPARTMENT OF ANIMAL HUSBANDRY & DAIRYING', 50, 20, { align: 'center' });
  
  doc.fontSize(16)
     .text('Antimicrobial Usage Compliance Report', 50, 45, { align: 'center' });

  // Authority Details
  doc.fillColor('#000000')
     .fontSize(10)
     .font('Helvetica')
     .text(`Report Generated By: ${authorityUser.display_name || 'Authority'}`, 50, 95);
  
  doc.text(`Role: ${authorityUser.role}`, 50, 108);
  doc.text(`Generated On: ${new Date().toLocaleString('en-IN')}`, 50, 121);
  
  // Report Period
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text(`Report Period: ${filters.fromDate} to ${filters.toDate}`, 50, 145);

  // Applied Filters
  let yPos = 165;
  if (filters.species || filters.state || filters.district || filters.medicine_category) {
    doc.fontSize(10).font('Helvetica').text('Applied Filters:', 50, yPos);
    yPos += 15;
    if (filters.species) {
      doc.text(`• Species: ${filters.species}`, 60, yPos);
      yPos += 12;
    }
    if (filters.state) {
      doc.text(`• State: ${filters.state}`, 60, yPos);
      yPos += 12;
    }
    if (filters.district) {
      doc.text(`• District: ${filters.district}`, 60, yPos);
      yPos += 12;
    }
    if (filters.medicine_category) {
      doc.text(`• Medicine Category: ${filters.medicine_category}`, 60, yPos);
      yPos += 12;
    }
    yPos += 10;
  }

  // Summary Statistics
  const safeTreatments = treatments.filter(t => t.risk_category === 'safe').length;
  const borderlineTreatments = treatments.filter(t => t.risk_category === 'borderline').length;
  const unsafeTreatments = treatments.filter(t => t.risk_category === 'unsafe').length;
  
  const medicineCounts = {};
  treatments.forEach(t => {
    if (t.medicine) {
      medicineCounts[t.medicine] = (medicineCounts[t.medicine] || 0) + 1;
    }
  });
  const topMedicines = Object.entries(medicineCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  const speciesCounts = {};
  treatments.forEach(t => {
    if (t.species) {
      speciesCounts[t.species] = (speciesCounts[t.species] || 0) + 1;
    }
  });
  const mostTreatedSpecies = Object.entries(speciesCounts)
    .sort(([,a], [,b]) => b - a)[0];

  doc.fontSize(12).font('Helvetica-Bold').text('SUMMARY', 50, yPos);
  yPos += 20;
  
  doc.fontSize(10).font('Helvetica');
  doc.text(`Total Treatments: ${treatments.length}`, 50, yPos);
  yPos += 15;
  doc.fillColor('#16a34a').text(`✓ Safe Treatments: ${safeTreatments}`, 50, yPos);
  yPos += 15;
  doc.fillColor('#f59e0b').text(`⚠ Borderline Treatments: ${borderlineTreatments}`, 50, yPos);
  yPos += 15;
  doc.fillColor('#dc2626').text(`✗ Unsafe Treatments: ${unsafeTreatments}`, 50, yPos);
  yPos += 15;
  
  doc.fillColor('#000000');
  if (topMedicines.length > 0) {
    doc.text('Top Medicines Used:', 50, yPos);
    yPos += 12;
    topMedicines.forEach(([med, count], idx) => {
      doc.text(`  ${idx + 1}. ${med}: ${count} times`, 60, yPos);
      yPos += 12;
    });
    yPos += 5;
  }
  
  if (mostTreatedSpecies) {
    doc.text(`Most Treated Species: ${mostTreatedSpecies[0]} (${mostTreatedSpecies[1]} treatments)`, 50, yPos);
    yPos += 20;
  }

  // Treatment Details
  doc.addPage();
  doc.fontSize(14).font('Helvetica-Bold').text('DETAILED TREATMENT RECORDS', 50, 50);
  
  yPos = 80;
  
  treatments.forEach((treatment, index) => {
    // Check if we need a new page
    if (yPos > 700) {
      doc.addPage();
      yPos = 50;
    }

    // Treatment header box
    doc.rect(50, yPos, pageWidth, 25)
       .fillAndStroke('#f0fdf4', '#16a34a');
    
    doc.fillColor('#000000')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text(`Treatment #${treatment.treatment_id} | ${treatment.species} - ${treatment.farm_name}`, 55, yPos + 8);
    
    yPos += 30;

    // Farmer Details
    doc.fontSize(9).font('Helvetica-Bold').text('FARMER DETAILS', 55, yPos);
    yPos += 12;
    doc.fontSize(8).font('Helvetica');
    doc.text(`Name: ${treatment.farmer_name || 'N/A'}`, 60, yPos);
    doc.text(`Aadhaar: ${treatment.aadhaar_number || 'N/A'}`, 300, yPos);
    yPos += 10;
    doc.text(`Phone: ${treatment.farmer_phone || 'N/A'}`, 60, yPos);
    doc.text(`Location: ${treatment.taluk}, ${treatment.district}, ${treatment.state}`, 300, yPos);
    yPos += 15;

    // Animal/Batch Details
    doc.fontSize(9).font('Helvetica-Bold').text('ANIMAL/BATCH DETAILS', 55, yPos);
    yPos += 12;
    doc.fontSize(8).font('Helvetica');
    doc.text(`Type: ${treatment.entity_type} | Species: ${treatment.species}`, 60, yPos);
    doc.text(`Matrix: ${treatment.matrix}`, 300, yPos);
    yPos += 10;
    doc.text(`ID: ${treatment.tag_id || treatment.batch_name || 'N/A'}`, 60, yPos);
    yPos += 15;

    // Treatment Details
    doc.fontSize(9).font('Helvetica-Bold').text('TREATMENT DETAILS', 55, yPos);
    yPos += 12;
    doc.fontSize(8).font('Helvetica');
    doc.text(`Medicine: ${treatment.medicine}`, 60, yPos);
    doc.text(`Category: ${treatment.category_type || 'N/A'}`, 300, yPos);
    yPos += 10;
    doc.text(`Active Ingredient: ${treatment.active_ingredient || 'N/A'}`, 60, yPos);
    yPos += 10;
    doc.text(`Route: ${treatment.route} | Dose: ${treatment.dose_amount} ${treatment.dose_unit}`, 60, yPos);
    yPos += 10;
    doc.text(`Frequency: ${treatment.frequency_per_day}x/day | Duration: ${treatment.duration_days} days`, 60, yPos);
    yPos += 10;
    doc.text(`Period: ${treatment.start_date} to ${treatment.end_date}`, 60, yPos);
    yPos += 10;
    doc.text(`Veterinarian: ${treatment.vet_name || 'Self-administered'}`, 60, yPos);
    yPos += 15;

    // AMR & Withdrawal Details
    doc.fontSize(9).font('Helvetica-Bold').text('AMR & WITHDRAWAL COMPLIANCE', 55, yPos);
    yPos += 12;
    doc.fontSize(8).font('Helvetica');
    doc.text(`Predicted Residual: ${treatment.predicted_mrl || 'N/A'}`, 60, yPos);
    doc.text(`Withdrawal Days: ${treatment.predicted_withdrawal_days || 'N/A'}`, 300, yPos);
    yPos += 10;
    doc.text(`Safe Date: ${treatment.safe_date || 'N/A'}`, 60, yPos);
    doc.text(`Current Status: ${treatment.current_safety_status}`, 300, yPos);
    yPos += 10;
    
    const riskColor = treatment.risk_category === 'unsafe' ? '#dc2626' : 
                      treatment.risk_category === 'borderline' ? '#f59e0b' : '#16a34a';
    doc.fillColor(riskColor);
    doc.text(`Risk: ${treatment.risk_category?.toUpperCase() || 'N/A'} (${treatment.risk_percent || 0}%)`, 60, yPos);
    doc.fillColor('#000000');
    doc.text(`Worst Tissue: ${treatment.worst_tissue || 'N/A'}`, 300, yPos);
    yPos += 10;
    if (treatment.overdosage) {
      doc.fillColor('#dc2626').text('⚠ OVERDOSAGE DETECTED', 60, yPos);
      doc.fillColor('#000000');
      yPos += 10;
    }
    yPos += 10;

    // Distributor Verification
    const relatedLogs = distributorLogs.filter(log => log.treatment_id === treatment.treatment_id);
    if (relatedLogs.length > 0) {
      doc.fontSize(9).font('Helvetica-Bold').text('DISTRIBUTOR VERIFICATION', 55, yPos);
      yPos += 12;
      relatedLogs.forEach(log => {
        doc.fontSize(8).font('Helvetica');
        const statusColor = log.verification_status === 'accepted' ? '#16a34a' : '#dc2626';
        doc.fillColor(statusColor);
        doc.text(`${log.verification_status.toUpperCase()}`, 60, yPos);
        doc.fillColor('#000000');
        doc.text(`by ${log.distributor_name} (${log.company_name})`, 120, yPos);
        yPos += 10;
        if (log.reason) {
          doc.text(`Reason: ${log.reason}`, 65, yPos);
          yPos += 10;
        }
      });
      yPos += 5;
    }

    // Separator
    doc.moveTo(50, yPos).lineTo(50 + pageWidth, yPos).stroke('#e5e7eb');
    yPos += 15;
  });

  // Footer on last page
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8)
       .fillColor('#6b7280')
       .text(`Page ${i + 1} of ${pageCount}`, 50, doc.page.height - 30, { align: 'center' });
    doc.text('Generated by DAHD AMU Monitoring System', 50, doc.page.height - 20, { align: 'center' });
  }
  } catch (error) {
    console.error('❌ Error in generatePDFReport:', error);
    throw error;
  }
}

module.exports = router;