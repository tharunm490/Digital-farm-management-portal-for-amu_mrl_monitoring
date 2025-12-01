const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, authorityOnly } = require('../middleware/auth');

// All routes require authentication and authority role
router.use(authMiddleware, authorityOnly);

// GET all entities for authority dashboard
router.get('/entities', async (req, res) => {
    try {
        const { page = 1, limit = 10, search, species } = req.query;
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
        COUNT(DISTINCT tr.treatment_id) as treatment_count,
        COUNT(DISTINCT CASE WHEN amu.risk_category = 'unsafe' THEN amu.amu_id END) as unsafe_treatments,
        MAX(tr.created_at) as last_treatment_date
      FROM animals_or_batches e
      JOIN farms f ON e.farm_id = f.farm_id
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

        query += ` GROUP BY e.entity_id, e.entity_type, e.tag_id, e.batch_name, e.species, e.matrix, f.farm_name ORDER BY last_treatment_date DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [entities] = await db.execute(query, params);

        // Get total count
        let countQuery = `
      SELECT COUNT(DISTINCT e.entity_id) as total
      FROM animals_or_batches e
      JOIN farms f ON e.farm_id = f.farm_id
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
        console.error('SQL Error Message:', error.sqlMessage);
        console.error('SQL State:', error.sqlState);
        res.status(500).json({ success: false, message: 'Failed to fetch entities', error: error.sqlMessage || error.message });
    }
});


// GET drug class distribution
router.get('/drug-classes', async (req, res) => {
    try {
        const query = `
      SELECT 
        COALESCE(
          CASE 
            WHEN medicine LIKE '%antibiotic%' OR medicine LIKE '%penicillin%' OR medicine LIKE '%amoxicillin%' THEN 'Antibiotics'
            WHEN medicine LIKE '%vaccine%' OR medicine LIKE '%vaccination%' THEN 'Vaccines'
            WHEN medicine LIKE '%parasite%' OR medicine LIKE '%ivermectin%' OR medicine LIKE '%albendazole%' THEN 'Antiparasitics'
            WHEN medicine LIKE '%inflammatory%' OR medicine LIKE '%meloxicam%' OR medicine LIKE '%flunixin%' THEN 'Anti-inflammatory'
            WHEN medicine LIKE '%vitamin%' OR medicine LIKE '%mineral%' THEN 'Vitamins & Minerals'
            ELSE 'Other'
          END, 'Unknown'
        ) as name,
        COUNT(*) as value
      FROM amu_records
      GROUP BY name
      ORDER BY value DESC
    `;

        const [data] = await db.execute(query);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching drug classes:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch drug classes', error: error.message });
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

// GET trends data - FIXED: Using amu_records.risk_category instead of non-existent mrl_status
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
        const { level = 'district' } = req.query;

        let mapsQuery;

        if (level === 'state') {
            // Group by state
            mapsQuery = `
        SELECT 
          fr.state as region,
          fr.state,
          NULL as district,
          COUNT(DISTINCT f.farm_id) as farm_count,
          COUNT(DISTINCT e.entity_id) as entity_count,
          COUNT(DISTINCT tr.treatment_id) as treatment_count,
          COUNT(DISTINCT CASE WHEN amu.risk_category = 'unsafe' THEN amu.amu_id END) as unsafe_count,
          ROUND(AVG(CASE 
            WHEN amu.risk_category = 'unsafe' THEN 100
            WHEN amu.risk_category = 'borderline' THEN 50
            ELSE 0
          END), 2) as avg_risk_score,
          CASE 
            WHEN COUNT(DISTINCT CASE WHEN amu.risk_category = 'unsafe' THEN amu.amu_id END) > 10 THEN 'high'
            WHEN COUNT(DISTINCT CASE WHEN amu.risk_category = 'unsafe' THEN amu.amu_id END) > 5 THEN 'medium'
            ELSE 'low'
          END as risk_level,
          AVG(f.latitude) as avg_latitude,
          AVG(f.longitude) as avg_longitude
        FROM farms f
        JOIN farmers fr ON f.farmer_id = fr.farmer_id
        LEFT JOIN animals_or_batches e ON f.farm_id = e.farm_id
        LEFT JOIN treatment_records tr ON e.entity_id = tr.entity_id
        LEFT JOIN amu_records amu ON tr.treatment_id = amu.treatment_id
        WHERE fr.state IS NOT NULL
        GROUP BY fr.state
        HAVING farm_count > 0
        ORDER BY unsafe_count DESC, treatment_count DESC
        LIMIT 50
      `;
        } else {
            // Group by district (state + district combination)
            mapsQuery = `
        SELECT 
          CONCAT(fr.state, ' - ', fr.district) as region,
          fr.state,
          fr.district,
          COUNT(DISTINCT f.farm_id) as farm_count,
          COUNT(DISTINCT e.entity_id) as entity_count,
          COUNT(DISTINCT tr.treatment_id) as treatment_count,
          COUNT(DISTINCT CASE WHEN amu.risk_category = 'unsafe' THEN amu.amu_id END) as unsafe_count,
          ROUND(AVG(CASE 
            WHEN amu.risk_category = 'unsafe' THEN 100
            WHEN amu.risk_category = 'borderline' THEN 50
            ELSE 0
          END), 2) as avg_risk_score,
          CASE 
            WHEN COUNT(DISTINCT CASE WHEN amu.risk_category = 'unsafe' THEN amu.amu_id END) > 10 THEN 'high'
            WHEN COUNT(DISTINCT CASE WHEN amu.risk_category = 'unsafe' THEN amu.amu_id END) > 5 THEN 'medium'
            ELSE 'low'
          END as risk_level,
          AVG(f.latitude) as avg_latitude,
          AVG(f.longitude) as avg_longitude
        FROM farms f
        JOIN farmers fr ON f.farmer_id = fr.farmer_id
        LEFT JOIN animals_or_batches e ON f.farm_id = e.farm_id
        LEFT JOIN treatment_records tr ON e.entity_id = tr.entity_id
        LEFT JOIN amu_records amu ON tr.treatment_id = amu.treatment_id
        WHERE fr.state IS NOT NULL AND fr.district IS NOT NULL
        GROUP BY fr.state, fr.district
        HAVING farm_count > 0
        ORDER BY unsafe_count DESC, treatment_count DESC
        LIMIT 50
      `;
        }

        const [maps] = await db.execute(mapsQuery);

        res.json({
            success: true,
            data: maps,
            level
        });
    } catch (error) {
        console.error('Error fetching maps data:', error);
        console.error('SQL Error Message:', error.sqlMessage);
        res.status(500).json({ success: false, message: 'Failed to fetch maps data', error: error.sqlMessage || error.message });
    }
});

// GET high-risk farms
router.get('/high-risk-farms', async (req, res) => {
    try {
        const { limit = 10, state, district } = req.query;

        // Check if farm_amu_metrics table exists
        const [tables] = await db.execute("SHOW TABLES LIKE 'farm_amu_metrics'");

        if (tables.length === 0) {
            // Table doesn't exist, return empty array
            return res.json({
                success: true,
                data: []
            });
        }

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

// GET global audit trail
router.get('/audit-trail', async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        // Check if blockchain_log table exists
        const [tables] = await db.execute("SHOW TABLES LIKE 'blockchain_log'");

        if (tables.length === 0) {
            // Table doesn't exist, return empty array
            return res.json({
                success: true,
                data: []
            });
        }

        const query = `
      SELECT 
        bl.*,
        f.farm_name,
        u.display_name as user_name
      FROM blockchain_log bl
      LEFT JOIN farms f ON bl.farm_id = f.farm_id
      LEFT JOIN users u ON bl.user_id = u.user_id
      ORDER BY bl.created_at DESC
      LIMIT ?
    `;

        const [logs] = await db.execute(query, [parseInt(limit)]);

        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('Error fetching global audit trail:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch audit trail' });
    }
});

module.exports = router;
