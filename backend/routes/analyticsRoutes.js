const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// 1. Total AMU usage count
router.get('/total-amu', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [result] = await db.execute('SELECT COUNT(*) AS total_amu FROM amu_records');
    res.json(result[0]);
  } catch (e) {
    console.error('Total AMU error:', e.message);
    res.status(500).json({ error: 'Failed to fetch total AMU' });
  }
});

// 2. Antibiotic usage by category
router.get('/category-usage', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [result] = await db.execute(`
      SELECT category_type AS category, COUNT(*) AS usage_count
      FROM amu_records
      WHERE category_type IS NOT NULL
      GROUP BY category_type
      ORDER BY usage_count DESC
    `);
    res.json(result);
  } catch (e) {
    console.error('Category usage error:', e.message);
    res.status(500).json({ error: 'Failed to fetch category usage' });
  }
});

// 3. Matrix-wise usage (milk/meat/egg)
router.get('/matrix-usage', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [result] = await db.execute(`
      SELECT matrix, COUNT(*) AS count
      FROM amu_records
      WHERE matrix IS NOT NULL
      GROUP BY matrix
      ORDER BY count DESC
    `);
    res.json(result);
  } catch (e) {
    console.error('Matrix usage error:', e.message);
    res.status(500).json({ error: 'Failed to fetch matrix usage' });
  }
});

// 4. State-wise AMU heatmap data
router.get('/state-usage', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [result] = await db.execute(`
      SELECT f.state, COUNT(*) AS usage
      FROM amu_records a
      JOIN farms f ON a.farm_id = f.farm_id
      WHERE f.state IS NOT NULL
      GROUP BY f.state
      ORDER BY usage DESC
    `);
    res.json(result);
  } catch (e) {
    console.error('State usage error:', e.message);
    res.status(500).json({ error: 'Failed to fetch state usage' });
  }
});

// 5. District-wise antibiotic distribution
router.get('/district-usage', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [result] = await db.execute(`
      SELECT f.state, f.district, COUNT(*) AS usage
      FROM amu_records a
      JOIN farms f ON a.farm_id = f.farm_id
      WHERE f.state IS NOT NULL AND f.district IS NOT NULL
      GROUP BY f.state, f.district
      ORDER BY usage DESC
    `);
    res.json(result);
  } catch (e) {
    console.error('District usage error:', e.message);
    res.status(500).json({ error: 'Failed to fetch district usage' });
  }
});

// 6. Lab report classification
router.get('/lab-reports-status', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [result] = await db.execute(`
      SELECT 
        final_status,
        COUNT(*) AS total
      FROM lab_test_reports
      GROUP BY final_status
    `);
    res.json(result);
  } catch (e) {
    console.error('Lab reports status error:', e.message);
    res.status(500).json({ error: 'Failed to fetch lab reports status' });
  }
});

// 7. Month-wise antibiotic trends
router.get('/monthly-trends', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [result] = await db.execute(`
      SELECT 
        DATE_FORMAT(start_date, '%Y-%m') AS month,
        COUNT(*) AS count
      FROM amu_records
      WHERE start_date IS NOT NULL
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `);
    res.json(result);
  } catch (e) {
    console.error('Monthly trends error:', e.message);
    res.status(500).json({ error: 'Failed to fetch monthly trends' });
  }
});

// 8. Species-wise treatment frequency
router.get('/species-usage', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [result] = await db.execute(`
      SELECT 
        a.species,
        COUNT(*) AS treatment_count
      FROM amu_records am
      JOIN animals_or_batches a ON am.entity_id = a.entity_id
      GROUP BY a.species
      ORDER BY treatment_count DESC
    `);
    res.json(result);
  } catch (e) {
    console.error('Species usage error:', e.message);
    res.status(500).json({ error: 'Failed to fetch species usage' });
  }
});

// 9. Residue detection trends over time
router.get('/residue-trends', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [result] = await db.execute(`
      SELECT 
        DATE_FORMAT(tested_on, '%Y-%m') AS month,
        AVG(detected_residue) AS avg_residue,
        MAX(detected_residue) AS max_residue,
        COUNT(*) AS test_count
      FROM lab_test_reports
      WHERE tested_on IS NOT NULL
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `);
    res.json(result);
  } catch (e) {
    console.error('Residue trends error:', e.message);
    res.status(500).json({ error: 'Failed to fetch residue trends' });
  }
});

// 10. Withdrawal compliance analysis
router.get('/withdrawal-compliance', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [result] = await db.execute(`
      SELECT 
        COUNT(*) AS total_samples,
        SUM(CASE WHEN final_status = 'safe' THEN 1 ELSE 0 END) AS compliant,
        SUM(CASE WHEN final_status != 'safe' THEN 1 ELSE 0 END) AS non_compliant,
        ROUND((SUM(CASE WHEN final_status = 'safe' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) AS compliance_rate
      FROM lab_test_reports
    `);
    res.json(result[0]);
  } catch (e) {
    console.error('Withdrawal compliance error:', e.message);
    res.status(500).json({ error: 'Failed to fetch withdrawal compliance' });
  }
});

// 11. Top risky farms
router.get('/risky-farms', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [result] = await db.execute(`
      SELECT 
        f.farm_name,
        f.district,
        f.state,
        COUNT(*) AS unsafe_reports,
        MAX(lr.detected_residue) AS max_residue
      FROM lab_test_reports lr
      JOIN samples s ON lr.sample_id = s.sample_id
      JOIN sample_requests sr ON s.sample_request_id = sr.sample_request_id
      JOIN animals_or_batches a ON sr.entity_id = a.entity_id
      JOIN farms f ON a.farm_id = f.farm_id
      WHERE lr.final_status = 'unsafe'
      GROUP BY f.farm_id, f.farm_name, f.district, f.state
      ORDER BY unsafe_reports DESC, max_residue DESC
      LIMIT 10
    `);
    res.json(result);
  } catch (e) {
    console.error('Risky farms error:', e.message);
    res.status(500).json({ error: 'Failed to fetch risky farms' });
  }
});

// 12. Dashboard overview (all key metrics)
router.get('/overview', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [totalAMU] = await db.execute('SELECT COUNT(*) AS total FROM amu_records');
    const [totalFarms] = await db.execute('SELECT COUNT(*) AS total FROM farms');
    const [totalSamples] = await db.execute('SELECT COUNT(*) AS total FROM lab_test_reports');
    const [unsafeReports] = await db.execute(`
      SELECT COUNT(*) AS total FROM lab_test_reports WHERE final_status = 'unsafe'
    `);
    const [pendingSamples] = await db.execute(`
      SELECT COUNT(*) AS total FROM sample_requests WHERE status = 'requested'
    `);

    res.json({
      total_amu_records: totalAMU[0].total,
      total_farms: totalFarms[0].total,
      total_lab_reports: totalSamples[0].total,
      unsafe_reports: unsafeReports[0].total,
      pending_samples: pendingSamples[0].total
    });
  } catch (e) {
    console.error('Overview error:', e.message);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

// 13. Automated insights
router.get('/insights', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const insights = [];

    // Check for high usage states
    const [stateUsage] = await db.execute(`
      SELECT f.state, COUNT(*) AS usage
      FROM amu_records a
      JOIN farms f ON a.farm_id = f.farm_id
      WHERE f.state IS NOT NULL
      GROUP BY f.state
      ORDER BY usage DESC
      LIMIT 1
    `);

    if (stateUsage.length > 0) {
      insights.push({
        type: 'warning',
        icon: '⚠',
        message: `${stateUsage[0].state} shows highest antibiotic usage with ${stateUsage[0].usage} records.`
      });
    }

    // Check for unsafe reports
    const [unsafeCount] = await db.execute(`
      SELECT COUNT(*) AS total FROM lab_test_reports WHERE final_status = 'unsafe'
    `);

    if (unsafeCount[0].total > 0) {
      insights.push({
        type: 'danger',
        icon: '❗',
        message: `${unsafeCount[0].total} reports marked UNSAFE – residue detected above MRL limits.`
      });
    }

    // Check for species with high usage
    const [speciesUsage] = await db.execute(`
      SELECT a.species, COUNT(*) AS count
      FROM amu_records am
      JOIN animals_or_batches a ON am.entity_id = a.entity_id
      GROUP BY a.species
      ORDER BY count DESC
      LIMIT 1
    `);

    if (speciesUsage.length > 0) {
      insights.push({
        type: 'info',
        icon: '🔥',
        message: `${speciesUsage[0].species} sector shows highest antimicrobial usage trend.`
      });
    }

    res.json(insights);
  } catch (e) {
    console.error('Insights error:', e.message);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

module.exports = router;
