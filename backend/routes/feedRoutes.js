const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Get all feed items for a specific species
router.get('/feed-scores/:species', authMiddleware, async (req, res) => {
  try {
    const { species } = req.params;
    
    const [feeds] = await db.execute(
      'SELECT * FROM feed_scores WHERE species = ? ORDER BY feed_item',
      [species]
    );
    
    res.json(feeds);
  } catch (error) {
    console.error('Error fetching feed scores:', error);
    res.status(500).json({ error: 'Failed to fetch feed scores' });
  }
});

// Submit farmer feed entry with AMU risk calculation
router.post('/farmer-feed-entry', authMiddleware, roleMiddleware(['farmer']), async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { farmer_id, species, feeds } = req.body;
    
    // Validate inputs
    if (!farmer_id || !species || !feeds || !Array.isArray(feeds) || feeds.length === 0) {
      return res.status(400).json({ error: 'Invalid input data' });
    }
    
    // Calculate Daily FNI and AMU Risk
    let dailyFNI = 0;
    const feedEntries = [];
    
    for (const feed of feeds) {
      const { feed_item, inclusion_rate, fni } = feed;
      
      // Get feed_id from feed_scores table
      const [feedData] = await connection.execute(
        'SELECT feed_id, fni FROM feed_scores WHERE species = ? AND feed_item = ?',
        [species, feed_item]
      );
      
      if (feedData.length === 0) {
        throw new Error(`Feed item "${feed_item}" not found for species ${species}`);
      }
      
      const feed_id = feedData[0].feed_id;
      const feed_fni = feedData[0].fni;
      
      // Calculate FNI contribution
      const fniContribution = inclusion_rate * feed_fni;
      dailyFNI += fniContribution;
      
      feedEntries.push({
        feed_id,
        inclusion_rate,
        fni_contribution: fniContribution
      });
    }
    
    // Calculate Health Risk and AMU Risk
    const healthRisk = 1 - dailyFNI;
    
    // Species sensitivity factors
    const sensitivityFactors = {
      cattle: 0.45,
      poultry: 0.65
    };
    
    const amuRisk = healthRisk * (sensitivityFactors[species] || 0.5);
    
    // Determine risk level
    let riskLevel;
    if (amuRisk < 0.20) riskLevel = 'low';
    else if (amuRisk < 0.40) riskLevel = 'moderate';
    else if (amuRisk < 0.60) riskLevel = 'high';
    else riskLevel = 'very_high';
    
    // Insert farmer feed entries
    for (const entry of feedEntries) {
      await connection.execute(
        `INSERT INTO farmer_feed_entries 
        (farmer_id, species, feed_id, inclusion_rate, fni_contribution, daily_fni, amu_risk) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [farmer_id, species, entry.feed_id, entry.inclusion_rate, entry.fni_contribution, dailyFNI, amuRisk]
      );
    }
    
    // Insert into feed risk summary
    await connection.execute(
      `INSERT INTO feed_risk_summary 
      (farmer_id, species, daily_fni, amu_risk, risk_level) 
      VALUES (?, ?, ?, ?, ?)`,
      [farmer_id, species, dailyFNI, amuRisk, riskLevel]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      dailyFNI: dailyFNI.toFixed(4),
      healthRisk: healthRisk.toFixed(4),
      amuRisk: amuRisk.toFixed(4),
      riskLevel
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error submitting farmer feed entry:', error);
    res.status(500).json({ error: error.message || 'Failed to submit feed entry' });
  } finally {
    connection.release();
  }
});

// Get farmer's feed history
router.get('/farmer-feed-history/:farmerId', authMiddleware, async (req, res) => {
  try {
    const { farmerId } = req.params;
    
    const [entries] = await db.execute(
      `SELECT 
        ffe.entry_id,
        ffe.species,
        fs.feed_item,
        ffe.inclusion_rate,
        ffe.fni_contribution,
        ffe.daily_fni,
        ffe.amu_risk,
        ffe.created_at
      FROM farmer_feed_entries ffe
      JOIN feed_scores fs ON ffe.feed_id = fs.feed_id
      WHERE ffe.farmer_id = ?
      ORDER BY ffe.created_at DESC
      LIMIT 50`,
      [farmerId]
    );
    
    res.json(entries);
  } catch (error) {
    console.error('Error fetching farmer feed history:', error);
    res.status(500).json({ error: 'Failed to fetch feed history' });
  }
});

// Get farmer's risk summary
router.get('/farmer-risk-summary/:farmerId', authMiddleware, async (req, res) => {
  try {
    const { farmerId } = req.params;
    
    const [summary] = await db.execute(
      `SELECT * FROM feed_risk_summary 
      WHERE farmer_id = ? 
      ORDER BY created_at DESC 
      LIMIT 10`,
      [farmerId]
    );
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching risk summary:', error);
    res.status(500).json({ error: 'Failed to fetch risk summary' });
  }
});

// AUTHORITY ROUTES

// Get all farmers' feed risk analytics
router.get('/authority/feed-risk-analytics', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const { riskLevel, species, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        frs.summary_id,
        frs.farmer_id,
        f.name as farmer_name,
        f.phone as farmer_phone,
        frs.species,
        frs.daily_fni,
        frs.amu_risk,
        frs.risk_level,
        frs.created_at
      FROM feed_risk_summary frs
      JOIN farmers f ON frs.farmer_id = f.farmer_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (riskLevel) {
      query += ' AND frs.risk_level = ?';
      params.push(riskLevel);
    }
    
    if (species) {
      query += ' AND frs.species = ?';
      params.push(species);
    }
    
    if (startDate) {
      query += ' AND frs.created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND frs.created_at <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY frs.created_at DESC LIMIT 100';
    
    const [results] = await db.execute(query, params);
    res.json(results);
    
  } catch (error) {
    console.error('Error fetching authority feed analytics:', error);
    res.status(500).json({ error: 'Failed to fetch feed risk analytics' });
  }
});

// Get feed risk statistics for authority dashboard
router.get('/authority/feed-risk-stats', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    // Overall statistics
    const [overallStats] = await db.execute(`
      SELECT 
        COUNT(DISTINCT farmer_id) as total_farmers,
        AVG(daily_fni) as avg_fni,
        AVG(amu_risk) as avg_amu_risk,
        SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) as low_risk_count,
        SUM(CASE WHEN risk_level = 'moderate' THEN 1 ELSE 0 END) as moderate_risk_count,
        SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high_risk_count,
        SUM(CASE WHEN risk_level = 'very_high' THEN 1 ELSE 0 END) as very_high_risk_count
      FROM feed_risk_summary
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    
    // Species-wise breakdown
    const [speciesStats] = await db.execute(`
      SELECT 
        species,
        COUNT(*) as entry_count,
        AVG(daily_fni) as avg_fni,
        AVG(amu_risk) as avg_amu_risk
      FROM feed_risk_summary
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY species
    `);
    
    // Top risky farmers
    const [riskyFarmers] = await db.execute(`
      SELECT 
        frs.farmer_id,
        f.name as farmer_name,
        frs.species,
        frs.amu_risk,
        frs.risk_level,
        frs.created_at
      FROM feed_risk_summary frs
      JOIN farmers f ON frs.farmer_id = f.farmer_id
      WHERE frs.risk_level IN ('high', 'very_high')
      ORDER BY frs.amu_risk DESC
      LIMIT 10
    `);
    
    res.json({
      overall: overallStats[0],
      bySpecies: speciesStats,
      riskyFarmers
    });
    
  } catch (error) {
    console.error('Error fetching feed risk stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get feed quality vs AMU risk comparison chart data
router.get('/authority/feed-quality-chart', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [chartData] = await db.execute(`
      SELECT 
        DATE(created_at) as date,
        species,
        AVG(daily_fni) as avg_fni,
        AVG(amu_risk) as avg_amu_risk,
        COUNT(*) as entry_count
      FROM feed_risk_summary
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at), species
      ORDER BY date DESC
    `);
    
    res.json(chartData);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// Get high-risk farmers alert count
router.get('/authority/high-risk-alerts', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [alerts] = await db.execute(`
      SELECT COUNT(*) as alert_count
      FROM feed_risk_summary
      WHERE risk_level IN ('high', 'very_high')
      AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    
    res.json({ alertCount: alerts[0].alert_count });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

module.exports = router;
