const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, authorityOnly } = require('../middleware/auth');

// All routes require authentication and authority role
router.use(authMiddleware, authorityOnly);

// GET all entities for authority dashboard
router.get('/entities', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, species, district, state } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        e.entity_id,
        e.entity_type,
        e.tag_id,
        e.batch_name,
        e.species,
        e.matrix,
        f.farm_name,
        fr.district,
        fr.state,
        u.display_name as farmer_name,
        COUNT(DISTINCT tr.treatment_id) as treatment_count,
        COUNT(DISTINCT CASE WHEN amu.risk_category = 'unsafe' THEN amu.amu_id END) as unsafe_treatments,
        MAX(tr.created_at) as last_treatment_date
      FROM animals_or_batches e
      JOIN farms f ON e.farm_id = f.farm_id
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      JOIN users u ON fr.user_id = u.user_id
      LEFT JOIN treatment_records tr ON e.entity_id = tr.entity_id
      LEFT JOIN amu_records amu ON tr.treatment_id = amu.treatment_id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND (e.tag_id LIKE ? OR e.batch_name LIKE ? OR f.farm_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (species) {
      query += ` AND e.species = ?`;
      params.push(species);
    }

    if (district) {
      query += ` AND fr.district = ?`;
      params.push(district);
    }

    if (state) {
      query += ` AND fr.state = ?`;
      params.push(state);
    }

    query += ` GROUP BY e.entity_id ORDER BY last_treatment_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [entities] = await db.execute(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT e.entity_id) as total
      FROM animals_or_batches e
      JOIN farms f ON e.farm_id = f.farm_id
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      WHERE 1=1
    `;

    const countParams = [];
    if (search) {
      countQuery += ` AND (e.tag_id LIKE ? OR e.batch_name LIKE ? OR f.farm_name LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (species) {
      countQuery += ` AND e.species = ?`;
      countParams.push(species);
    }
    if (district) {
      countQuery += ` AND fr.district = ?`;
      countParams.push(district);
    }
    if (state) {
      countQuery += ` AND fr.state = ?`;
      countParams.push(state);
    }

    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: entities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching entities for authority:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch entities' });
  }
});

// GET dashboard statistics
router.get('/dashboard-stats', async (req, res) => {
  try {
    const { state, district } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (state) {
      whereClause += ' AND fr.state = ?';
      params.push(state);
    }

    if (district) {
      whereClause += ' AND fr.district = ?';
      params.push(district);
    }

    // Get comprehensive stats
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT f.farm_id) as total_farms,
        COUNT(DISTINCT e.entity_id) as total_entities,
        COUNT(DISTINCT tr.treatment_id) as total_treatments,
        COUNT(DISTINCT CASE WHEN amu.risk_category = 'unsafe' THEN amu.amu_id END) as unsafe_treatments,
        COUNT(DISTINCT CASE WHEN amu.risk_category = 'borderline' THEN amu.amu_id END) as borderline_treatments,
        COUNT(DISTINCT CASE WHEN mrl.risk_percent > 100 THEN mrl.amu_id END) as mrl_violations,
        COUNT(DISTINCT fr.farmer_id) as total_farmers
      FROM farms f
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN animals_or_batches e ON f.farm_id = e.farm_id
      LEFT JOIN treatment_records tr ON e.entity_id = tr.entity_id
      LEFT JOIN amu_records amu ON tr.treatment_id = amu.treatment_id
      LEFT JOIN amu_tissue_results mrl ON amu.amu_id = mrl.amu_id
      WHERE ${whereClause}
    `;

    const [stats] = await db.execute(statsQuery, params);

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics' });
  }
});

// GET trends data
router.get('/trends', async (req, res) => {
  try {
    const { period = 'monthly', state, district } = req.query;

    let dateFormat = period === 'weekly' ? '%Y-%u' : '%Y-%m';
    let whereClause = '1=1';
    const params = [];

    if (state) {
      whereClause += ' AND fr.state = ?';
      params.push(state);
    }

    if (district) {
      whereClause += ' AND fr.district = ?';
      params.push(district);
    }

    const trendsQuery = `
      SELECT 
        DATE_FORMAT(tr.created_at, '${dateFormat}') as period,
        COUNT(DISTINCT tr.treatment_id) as treatments,
        COUNT(DISTINCT CASE WHEN amu.risk_category = 'unsafe' THEN amu.amu_id END) as unsafe_treatments,
        COUNT(DISTINCT CASE WHEN amu.risk_category = 'borderline' THEN amu.amu_id END) as borderline_treatments,
        COUNT(DISTINCT CASE WHEN mrl.risk_percent > 100 THEN mrl.amu_id END) as mrl_violations,
        AVG(CASE WHEN mrl.risk_percent IS NOT NULL THEN mrl.risk_percent ELSE 0 END) as avg_mrl_percentage
      FROM treatment_records tr
      JOIN animals_or_batches e ON tr.entity_id = e.entity_id
      JOIN farms f ON e.farm_id = f.farm_id
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN amu_records amu ON tr.treatment_id = amu.treatment_id
      LEFT JOIN amu_tissue_results mrl ON amu.amu_id = mrl.amu_id
      WHERE ${whereClause} AND tr.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(tr.created_at, '${dateFormat}')
      ORDER BY period ASC
    `;

    const [trends] = await db.execute(trendsQuery, params);

    res.json({
      success: true,
      data: trends,
      period
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trends data' });
  }
});

// GET geographic distribution (maps data)
router.get('/maps', async (req, res) => {
  try {
    const { level = 'district', state } = req.query;

    let groupBy = level === 'state' ? 'fr.state' : 'fr.district';
    let whereClause = '1=1';
    const params = [];

    if (level === 'district' && state) {
      whereClause += ' AND fr.state = ?';
      params.push(state);
    }

    const mapsQuery = `
      SELECT 
        ${level === 'state' ? 'fr.state as region' : 'fr.district as region'},
        fr.state,
        COUNT(DISTINCT f.farm_id) as farm_count,
        COUNT(DISTINCT e.entity_id) as entity_count,
        COUNT(DISTINCT tr.treatment_id) as treatment_count,
        COUNT(DISTINCT CASE WHEN amu.risk_category = 'unsafe' THEN amu.amu_id END) as unsafe_count,
        ROUND(AVG(CASE WHEN fm.risk_score IS NOT NULL THEN fm.risk_score ELSE 0 END), 2) as avg_risk_score,
        CASE 
          WHEN AVG(CASE WHEN fm.risk_score IS NOT NULL THEN fm.risk_score ELSE 0 END) >= 70 THEN 'high'
          WHEN AVG(CASE WHEN fm.risk_score IS NOT NULL THEN fm.risk_score ELSE 0 END) >= 40 THEN 'medium'
          ELSE 'low'
        END as risk_level
      FROM farms f
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN animals_or_batches e ON f.farm_id = e.farm_id
      LEFT JOIN treatment_records tr ON e.entity_id = tr.entity_id
      LEFT JOIN amu_records amu ON tr.treatment_id = amu.treatment_id
      LEFT JOIN farm_amu_metrics fm ON f.farm_id = fm.farm_id
      WHERE ${whereClause}
      GROUP BY ${groupBy}
      ORDER BY avg_risk_score DESC
    `;

    const [maps] = await db.execute(mapsQuery, params);

    res.json({
      success: true,
      data: maps,
      level
    });
  } catch (error) {
    console.error('Error fetching maps data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch maps data' });
  }
});

// GET high-risk farms
router.get('/high-risk-farms', async (req, res) => {
  try {
    const { limit = 10, state, district } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (state) {
      whereClause += ' AND fr.state = ?';
      params.push(state);
    }

    if (district) {
      whereClause += ' AND fr.district = ?';
      params.push(district);
    }

    const riskQuery = `
      SELECT 
        f.farm_id,
        f.farm_name,
        u.display_name as farmer_name,
        fr.district,
        fr.state,
        fr.phone,
        fm.risk_score,
        fm.risk_level,
        fm.unsafe_records,
        fm.borderline_records,
        COUNT(DISTINCT ca.alert_id) as active_alerts
      FROM farms f
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      JOIN users u ON fr.user_id = u.user_id
      LEFT JOIN farm_amu_metrics fm ON f.farm_id = fm.farm_id
      LEFT JOIN compliance_alerts ca ON f.farm_id = ca.farm_id AND ca.resolved = FALSE
      WHERE ${whereClause} AND (fm.risk_score >= 50 OR fm.risk_level IN ('high', 'critical'))
      GROUP BY f.farm_id
      ORDER BY fm.risk_score DESC
      LIMIT ?
    `;

    params.push(parseInt(limit));
    const [farms] = await db.execute(riskQuery, params);

    res.json({
      success: true,
      data: farms
    });
  } catch (error) {
    console.error('Error fetching high-risk farms:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch high-risk farms' });
  }
});

module.exports = router;