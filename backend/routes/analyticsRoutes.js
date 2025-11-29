const express = require('express');
const router = express.Router();
const db = require('../config/database');
const ComplianceEngine = require('../models/ComplianceEngine');
const BlockchainService = require('../services/BlockchainService');

// ========================================
// ANALYTICS ENDPOINTS
// ========================================

// GET AMU trends (time-series data)
router.get('/amu-trends', async (req, res) => {
  try {
    const { farm_id, start_date, end_date, interval = 'monthly' } = req.query;

    let query = `
      SELECT 
        DATE_FORMAT(amu.created_at, '%Y-%m-01') as period,
        COUNT(*) as treatment_count,
        SUM(amu.dose_amount) as total_dose,
        COUNT(DISTINCT amu.medicine) as unique_medicines,
        SUM(CASE WHEN amu.risk_category = 'unsafe' THEN 1 ELSE 0 END) as unsafe_count,
        SUM(CASE WHEN amu.risk_category = 'borderline' THEN 1 ELSE 0 END) as borderline_count
      FROM amu_records amu
      WHERE 1=1
    `;

    const params = [];

    if (farm_id) {
      query += ` AND amu.farm_id = ?`;
      params.push(farm_id);
    }

    if (start_date) {
      query += ` AND amu.created_at >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND amu.created_at <= ?`;
      params.push(end_date);
    }

    query += ` GROUP BY DATE_FORMAT(amu.created_at, '%Y-%m-01')
              ORDER BY period ASC`;

    const [results] = await db.execute(query, params);

    res.json({
      success: true,
      data: results,
      interval
    });
  } catch (error) {
    console.error('Error fetching AMU trends:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET district heatmap (geographic AMU distribution)
router.get('/district-heatmap', async (req, res) => {
  try {
    const { state } = req.query;

    let query = `
      SELECT 
        f.farm_id,
        fr.district,
        fr.state,
        COUNT(DISTINCT amu.amu_id) as total_treatments,
        COUNT(DISTINCT CASE WHEN amu.risk_category = 'unsafe' THEN amu.amu_id END) as unsafe_count,
        SUM(CASE WHEN d.who_criticality = 'critically_important' THEN 1 ELSE 0 END) as critical_drugs_count,
        AVG(fm.risk_score) as avg_risk_score
      FROM farms f
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN animals_or_batches e ON f.farm_id = e.farm_id
      LEFT JOIN amu_records amu ON e.entity_id = amu.entity_id
      LEFT JOIN drug_master d ON amu.medicine = d.drug_name
      LEFT JOIN farm_amu_metrics fm ON f.farm_id = fm.farm_id
      WHERE 1=1
    `;

    const params = [];

    if (state) {
      query += ` AND fr.state = ?`;
      params.push(state);
    }

    query += ` GROUP BY f.farm_id, fr.district, fr.state
              ORDER BY (avg_risk_score IS NULL), avg_risk_score DESC`;

    const [results] = await db.execute(query, params);

    // Transform to format suitable for heatmap
    const heatmapData = results.map(row => ({
      district: row.district,
      state: row.state,
      farm_id: row.farm_id,
      intensity: row.avg_risk_score || 0,
      treatments: row.total_treatments,
      unsafe_treatments: row.unsafe_count,
      critical_drugs: row.critical_drugs_count
    }));

    res.json({
      success: true,
      data: heatmapData
    });
  } catch (error) {
    console.error('Error fetching district heatmap:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET species-wise usage breakdown
router.get('/species-breakdown', async (req, res) => {
  try {
    const { farm_id, start_date, end_date } = req.query;

    let query = `
      SELECT 
        amu.species,
        COUNT(*) as treatment_count,
        COUNT(DISTINCT amu.medicine) as unique_medicines,
        SUM(CASE WHEN amu.risk_category = 'unsafe' THEN 1 ELSE 0 END) as unsafe_count,
        SUM(CASE WHEN amu.risk_category = 'borderline' THEN 1 ELSE 0 END) as borderline_count,
        AVG(amu.predicted_mrl_risk) as avg_mrl_risk
      FROM amu_records amu
      WHERE 1=1
    `;

    const params = [];

    if (farm_id) {
      query += ` AND amu.farm_id = ?`;
      params.push(farm_id);
    }

    if (start_date) {
      query += ` AND amu.created_at >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND amu.created_at <= ?`;
      params.push(end_date);
    }

    query += ` GROUP BY amu.species ORDER BY treatment_count DESC`;

    const [results] = await db.execute(query, params);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching species breakdown:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET drug class distribution
router.get('/drug-class-distribution', async (req, res) => {
  try {
    const { farm_id, start_date, end_date } = req.query;

    let query = `
      SELECT 
        amu.medication_type as drug_class,
        COUNT(*) as usage_count,
        COUNT(DISTINCT amu.medicine) as unique_medicines,
        COUNT(DISTINCT CASE WHEN amu.risk_category = 'unsafe' THEN amu.amu_id END) as unsafe_count,
        AVG(amu.predicted_mrl_risk) as avg_mrl_risk
      FROM amu_records amu
      WHERE 1=1
    `;

    const params = [];

    if (farm_id) {
      query += ` AND amu.farm_id = ?`;
      params.push(farm_id);
    }

    if (start_date) {
      query += ` AND amu.created_at >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND amu.created_at <= ?`;
      params.push(end_date);
    }

    query += ` GROUP BY amu.medication_type ORDER BY usage_count DESC`;

    const [results] = await db.execute(query, params);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching drug class distribution:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET high-risk farms list
router.get('/risk-farms', async (req, res) => {
  try {
    const { state, district, min_risk_score = 50, limit = 20 } = req.query;

    let query = `
      SELECT 
        f.farm_id,
        f.farm_name,
        fr.farmer_id,
        u.display_name as farmer_name,
        fr.phone,
        fr.district,
        fr.state,
        fm.risk_score,
        fm.risk_level,
        fm.unsafe_records,
        fm.borderline_records,
        COUNT(DISTINCT ca.alert_id) as unresolved_alerts
      FROM farms f
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      JOIN users u ON fr.user_id = u.user_id
      LEFT JOIN farm_amu_metrics fm ON f.farm_id = fm.farm_id
      LEFT JOIN compliance_alerts ca ON f.farm_id = ca.farm_id AND ca.resolved = FALSE
      WHERE 1=1
    `;

    const params = [];

    if (state) {
      query += ` AND fr.state = ?`;
      params.push(state);
    }

    if (district) {
      query += ` AND fr.district = ?`;
      params.push(district);
    }

    query += ` AND (fm.risk_score >= ? OR fm.risk_score IS NULL)
              GROUP BY f.farm_id
              ORDER BY (fm.risk_score IS NULL), fm.risk_score DESC
              LIMIT ?`;
    params.push(min_risk_score, limit);

    const [results] = await db.execute(query, params);

    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error fetching risk farms:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET WOAH ANIMUSE export format
router.get('/woah-export', async (req, res) => {
  try {
    const { start_date, end_date, state } = req.query;

    let query = `
      SELECT 
        f.farm_id,
        fr.state,
        fr.district,
        amu.species,
        amu.medication_type,
        amu.medicine as active_ingredient,
        amu.route,
        amu.dose_amount,
        amu.dose_unit,
        amu.duration_days,
        COUNT(*) as frequency,
        AVG(amu.predicted_mrl_risk) as avg_mrl_risk,
        amu.created_at
      FROM amu_records amu
      JOIN treatment_records tr ON amu.treatment_id = tr.treatment_id
      JOIN animals_or_batches e ON amu.entity_id = e.entity_id
      JOIN farms f ON amu.farm_id = f.farm_id
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      WHERE 1=1
    `;

    const params = [];

    if (start_date) {
      query += ` AND amu.created_at >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND amu.created_at <= ?`;
      params.push(end_date);
    }

    if (state) {
      query += ` AND fr.state = ?`;
      params.push(state);
    }

    query += ` GROUP BY f.farm_id, amu.species, amu.medication_type, amu.medicine, amu.route
              ORDER BY f.farm_id, amu.species`;

    const [results] = await db.execute(query, params);

    // Format for WOAH ANIMUSE export
    const woahData = results.map(row => ({
      country: 'India',
      production_type: row.species,
      antimicrobial_agent: row.medicine,
      antimicrobial_class: row.medication_type,
      route: row.route,
      amount_used_mg: row.dose_amount * row.frequency * row.duration_days,
      units: row.dose_unit,
      number_of_animals: 1, // Per animal/batch
      days_of_use: row.duration_days
    }));

    // Set response headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="woah-animuse-export.json"');

    res.json({
      format: 'WOAH ANIMUSE',
      export_date: new Date().toISOString(),
      data: woahData
    });
  } catch (error) {
    console.error('Error generating WOAH export:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET compliance rate by district
router.get('/compliance-rate', async (req, res) => {
  try {
    const { state } = req.query;

    let query = `
      SELECT 
        fr.district,
        fr.state,
        COUNT(DISTINCT f.farm_id) as total_farms,
        COUNT(DISTINCT CASE WHEN fm.risk_level IN ('low', 'medium') THEN f.farm_id END) as compliant_farms,
        ROUND(COUNT(DISTINCT CASE WHEN fm.risk_level IN ('low', 'medium') THEN f.farm_id END) * 100 / COUNT(DISTINCT f.farm_id), 2) as compliance_rate
      FROM farms f
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN farm_amu_metrics fm ON f.farm_id = fm.farm_id
      WHERE 1=1
    `;

    const params = [];

    if (state) {
      query += ` AND fr.state = ?`;
      params.push(state);
    }

    query += ` GROUP BY fr.district, fr.state
              ORDER BY compliance_rate DESC`;

    const [results] = await db.execute(query, params);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching compliance rate:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET critical drug usage analytics
router.get('/critical-drugs', async (req, res) => {
  try {
    const { state, district, start_date, end_date } = req.query;

    let query = `
      SELECT 
        d.drug_id,
        d.drug_name,
        d.who_criticality,
        COUNT(*) as usage_count,
        COUNT(DISTINCT amu.farm_id) as farms_using,
        COUNT(DISTINCT CASE WHEN amu.risk_category = 'unsafe' THEN amu.amu_id END) as unsafe_usage,
        AVG(amu.predicted_mrl_risk) as avg_mrl_risk
      FROM amu_records amu
      JOIN drug_master d ON amu.medicine = d.drug_name
      JOIN farms f ON amu.farm_id = f.farm_id
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      WHERE d.who_criticality = 'critically_important'
    `;

    const params = [];

    if (state) {
      query += ` AND fr.state = ?`;
      params.push(state);
    }

    if (district) {
      query += ` AND fr.district = ?`;
      params.push(district);
    }

    if (start_date) {
      query += ` AND amu.created_at >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND amu.created_at <= ?`;
      params.push(end_date);
    }

    query += ` GROUP BY d.drug_id, d.drug_name, d.who_criticality
              ORDER BY usage_count DESC`;

    const [results] = await db.execute(query, params);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching critical drugs analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET farm compliance details
router.get('/farm/:farm_id/compliance', async (req, res) => {
  try {
    const { farm_id } = req.params;

    const metrics = await ComplianceEngine.getFarmComplianceMetrics(farm_id);
    const alerts = await ComplianceEngine.getUnresolvedAlerts(farm_id, 10);

    res.json({
      success: true,
      metrics,
      recent_alerts: alerts
    });
  } catch (error) {
    console.error('Error fetching farm compliance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET farm audit trail
router.get('/farm/:farm_id/audit-trail', async (req, res) => {
  try {
    const { farm_id } = req.params;
    const { limit = 50 } = req.query;

    const auditTrail = await BlockchainService.getFarmAuditTrail(farm_id, limit);

    res.json({
      success: true,
      data: auditTrail,
      count: auditTrail.length
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET blockchain statistics
router.get('/farm/:farm_id/blockchain-stats', async (req, res) => {
  try {
    const { farm_id } = req.params;

    const stats = await BlockchainService.getBlockchainStats(farm_id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching blockchain stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET geographic aggregation (state, district, taluk) with AMU and MRL trends
router.get('/geo', async (req, res) => {
  try {
    const { level = 'state', from, to, selectedState } = req.query;

    // Validate level
    if (!['state', 'district', 'taluk'].includes(level)) {
      return res.status(400).json({ success: false, message: 'Invalid level. Use state, district, or taluk.' });
    }

    // Build aggregation query
    let groupByField = level === 'state' ? 'fr.state'
      : level === 'district' ? 'fr.district, fr.state'
        : 'fr.taluk, fr.district, fr.state';

    let whereClause = '1=1';
    const params = [];

    // Filter by state if district/taluk level
    if ((level === 'district' || level === 'taluk') && selectedState) {
      whereClause += ' AND fr.state = ?';
      params.push(selectedState);
    }

    // Date range filters
    if (from) {
      whereClause += ' AND amu.created_at >= ?';
      params.push(from);
    }
    if (to) {
      whereClause += ' AND amu.created_at <= ?';
      params.push(to);
    }

    // Main aggregation query
    const query = `
      SELECT 
        ${level === 'state' ? 'fr.state as region_name' : level === 'district' ? 'fr.district as region_name' : 'fr.taluk as region_name'},
        fr.state,
        COUNT(DISTINCT f.farm_id) as farm_count,
        COUNT(DISTINCT e.entity_id) as entity_count,
        COUNT(DISTINCT amu.amu_id) as treatment_count,
        ROUND(COUNT(DISTINCT amu.amu_id) / NULLIF(COUNT(DISTINCT f.farm_id), 0), 2) as amu_intensity,
        SUM(CASE WHEN amu.risk_category = 'safe' THEN 1 ELSE 0 END) as safe_count,
        SUM(CASE WHEN amu.risk_category = 'borderline' THEN 1 ELSE 0 END) as borderline_count,
        SUM(CASE WHEN amu.risk_category = 'unsafe' THEN 1 ELSE 0 END) as unsafe_count,
        ROUND(AVG(CASE WHEN mrl.risk_percent IS NOT NULL THEN mrl.risk_percent ELSE 0 END), 2) as avg_mrl_percentage,
        SUM(CASE WHEN mrl.risk_percent > 100 THEN 1 ELSE 0 END) as mrl_violations,
        ROUND(AVG(CASE WHEN fm.risk_score IS NOT NULL THEN fm.risk_score ELSE 0 END), 2) as avg_risk_score
      FROM farms f
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN animals_or_batches e ON f.farm_id = e.farm_id
      LEFT JOIN amu_records amu ON e.entity_id = amu.entity_id
      LEFT JOIN amu_tissue_results mrl ON amu.amu_id = mrl.amu_id
      LEFT JOIN farm_amu_metrics fm ON f.farm_id = fm.farm_id
      WHERE ${whereClause}
      GROUP BY ${groupByField}
      ORDER BY amu_intensity DESC
    `;

    const [regions] = await db.execute(query, params);

    // For each region, fetch monthly trend data
    const trendsQuery = `
      SELECT 
        ${level === 'state' ? 'fr.state as region_name' : level === 'district' ? 'fr.district as region_name' : 'fr.taluk as region_name'},
        DATE_FORMAT(amu.created_at, '%Y-%m-01') as month,
        COUNT(DISTINCT amu.amu_id) as treatment_count,
        SUM(CASE WHEN amu.risk_category = 'unsafe' THEN 1 ELSE 0 END) as unsafe_count,
        SUM(CASE WHEN amu.risk_category = 'borderline' THEN 1 ELSE 0 END) as borderline_count,
        SUM(CASE WHEN amu.risk_category = 'safe' THEN 1 ELSE 0 END) as safe_count,
        ROUND(AVG(CASE WHEN mrl.risk_percent IS NOT NULL THEN mrl.risk_percent ELSE 0 END), 2) as avg_mrl_percentage
      FROM farms f
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN animals_or_batches e ON f.farm_id = e.farm_id
      LEFT JOIN amu_records amu ON e.entity_id = amu.entity_id
      LEFT JOIN amu_tissue_results mrl ON amu.amu_id = mrl.amu_id
      WHERE ${whereClause} AND amu.created_at IS NOT NULL
      GROUP BY ${groupByField}, DATE_FORMAT(amu.created_at, '%Y-%m-01')
      ORDER BY month ASC
    `;

    const [trends] = await db.execute(trendsQuery, params);

    // Organize trends by region
    const regionTrends = {};
    trends.forEach(trend => {
      const regionName = trend.region_name;
      if (!regionTrends[regionName]) {
        regionTrends[regionName] = [];
      }
      regionTrends[regionName].push({
        month: trend.month,
        treatment_count: trend.treatment_count,
        unsafe_count: trend.unsafe_count,
        borderline_count: trend.borderline_count,
        safe_count: trend.safe_count,
        avg_mrl_percentage: trend.avg_mrl_percentage
      });
    });

    // Merge trend data into regions
    const enrichedRegions = regions.map(region => ({
      ...region,
      trends: regionTrends[region.region_name] || []
    }));

    res.json({
      success: true,
      level,
      data: enrichedRegions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching geographic aggregation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
