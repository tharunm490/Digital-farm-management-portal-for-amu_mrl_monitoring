const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Get biomass-based AMU usage (all species)
router.get('/biomass-usage', authMiddleware, roleMiddleware(['authority', 'veterinarian']), async (req, res) => {
  try {
    const { state, district } = req.query;
    const userRole = req.user.role;

    let query = `
      SELECT 
        ab.species,
        COUNT(tr.treatment_id) AS treatment_count,
        ROUND(
          SUM(
            tr.dose_amount * tr.duration_days * 
            COALESCE(ab.batch_count, 1) * 
            COALESCE(tr.avg_weight_kg, sw.avg_weight_kg)
          ) / 1000, 2
        ) AS biomass_kg
      FROM treatment_records tr
      JOIN animals_or_batches ab ON tr.entity_id = ab.entity_id
      LEFT JOIN species_avg_weights sw ON ab.species = sw.species
    `;

    const params = [];

    // Role-based filtering
    if (userRole === 'veterinarian') {
      query += `
        JOIN farms f ON tr.farm_id = f.farm_id
        WHERE f.assigned_vet_id = ?
      `;
      params.push(req.user.user_id);
    } else if (userRole === 'authority') {
      if (district || state) {
        query += `
          JOIN farms f ON tr.farm_id = f.farm_id
          WHERE 1=1
        `;
        if (district) {
          query += ` AND f.district = ?`;
          params.push(district);
        }
        if (state) {
          query += ` AND f.state = ?`;
          params.push(state);
        }
      }
    }

    query += ` GROUP BY ab.species ORDER BY biomass_kg DESC`;

    const [results] = await db.execute(query, params);
    res.json(results);

  } catch (error) {
    console.error('Biomass usage error:', error);
    res.status(500).json({ error: 'Failed to fetch biomass usage data' });
  }
});

// Get total biomass statistics
router.get('/biomass-stats', authMiddleware, roleMiddleware(['authority', 'veterinarian']), async (req, res) => {
  try {
    const { state, district } = req.query;
    const userRole = req.user.role;

    let query = `
      SELECT 
        COUNT(DISTINCT tr.treatment_id) AS total_treatments,
        COUNT(DISTINCT tr.farm_id) AS total_farms,
        ROUND(
          SUM(
            tr.dose_amount * tr.duration_days * 
            COALESCE(ab.batch_count, 1) * 
            COALESCE(tr.avg_weight_kg, sw.avg_weight_kg)
          ) / 1000, 2
        ) AS total_biomass_kg,
        ROUND(AVG(COALESCE(tr.avg_weight_kg, sw.avg_weight_kg)), 2) AS avg_animal_weight
      FROM treatment_records tr
      JOIN animals_or_batches ab ON tr.entity_id = ab.entity_id
      LEFT JOIN species_avg_weights sw ON ab.species = sw.species
    `;

    const params = [];

    if (userRole === 'veterinarian') {
      query += `
        JOIN farms f ON tr.farm_id = f.farm_id
        WHERE f.assigned_vet_id = ?
      `;
      params.push(req.user.user_id);
    } else if (userRole === 'authority') {
      if (district || state) {
        query += `
          JOIN farms f ON tr.farm_id = f.farm_id
          WHERE 1=1
        `;
        if (district) {
          query += ` AND f.district = ?`;
          params.push(district);
        }
        if (state) {
          query += ` AND f.state = ?`;
          params.push(state);
        }
      }
    }

    const [results] = await db.execute(query, params);
    res.json(results[0] || {});

  } catch (error) {
    console.error('Biomass stats error:', error);
    res.status(500).json({ error: 'Failed to fetch biomass statistics' });
  }
});

// Get state/district-wise biomass distribution
router.get('/biomass-by-location', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const { groupBy = 'state' } = req.query; // 'state' or 'district'

    const groupField = groupBy === 'district' ? 'f.district, f.state' : 'f.state';

    const query = `
      SELECT 
        ${groupBy === 'district' ? 'f.district,' : ''} f.state,
        COUNT(DISTINCT tr.treatment_id) AS treatment_count,
        ROUND(
          SUM(
            tr.dose_amount * tr.duration_days * 
            COALESCE(ab.batch_count, 1) * 
            COALESCE(tr.avg_weight_kg, sw.avg_weight_kg)
          ) / 1000, 2
        ) AS biomass_kg
      FROM treatment_records tr
      JOIN animals_or_batches ab ON tr.entity_id = ab.entity_id
      JOIN farms f ON tr.farm_id = f.farm_id
      LEFT JOIN species_avg_weights sw ON ab.species = sw.species
      WHERE f.state IS NOT NULL
      GROUP BY ${groupField}
      ORDER BY biomass_kg DESC
      LIMIT 20
    `;

    const [results] = await db.execute(query);
    res.json(results);

  } catch (error) {
    console.error('Biomass by location error:', error);
    res.status(500).json({ error: 'Failed to fetch location-wise biomass data' });
  }
});

// Get species default weights
router.get('/species-weights', authMiddleware, async (req, res) => {
  try {
    const [results] = await db.execute('SELECT * FROM species_avg_weights ORDER BY species');
    res.json(results);
  } catch (error) {
    console.error('Species weights error:', error);
    res.status(500).json({ error: 'Failed to fetch species weights' });
  }
});

// Get monthly biomass trends
router.get('/biomass-trends', authMiddleware, roleMiddleware(['authority', 'veterinarian']), async (req, res) => {
  try {
    const userRole = req.user.role;
    const params = [];

    let query = `
      SELECT 
        DATE_FORMAT(tr.start_date, '%Y-%m') AS month,
        ab.species,
        COUNT(tr.treatment_id) AS treatment_count,
        ROUND(
          SUM(
            tr.dose_amount * tr.duration_days * 
            COALESCE(ab.batch_count, 1) * 
            COALESCE(tr.avg_weight_kg, sw.avg_weight_kg)
          ) / 1000, 2
        ) AS biomass_kg
      FROM treatment_records tr
      JOIN animals_or_batches ab ON tr.entity_id = ab.entity_id
      LEFT JOIN species_avg_weights sw ON ab.species = sw.species
    `;

    if (userRole === 'veterinarian') {
      query += `
        JOIN farms f ON tr.farm_id = f.farm_id
        WHERE f.assigned_vet_id = ?
      `;
      params.push(req.user.user_id);
    }

    query += `
      GROUP BY month, ab.species
      ORDER BY month DESC, biomass_kg DESC
      LIMIT 60
    `;

    const [results] = await db.execute(query, params);
    res.json(results);

  } catch (error) {
    console.error('Biomass trends error:', error);
    res.status(500).json({ error: 'Failed to fetch biomass trends' });
  }
});

module.exports = router;
