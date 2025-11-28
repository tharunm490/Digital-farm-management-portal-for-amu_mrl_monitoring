const express = require('express');
const router = express.Router();
const Treatment = require('../models/Treatment');
const AMU = require('../models/AMU');
const Entity = require('../models/Entity');
const Farm = require('../models/Farm');
const MRL = require('../models/MRL');
const { authMiddleware, veterinarianOnly } = require('../middleware/auth');
const { predictTissueMrl, checkOverdosage, calculateSafeDate } = require('../utils/amuTissueService');
const db = require('../config/database');

// Helper function to convert integer date (YYYYMMDD) to string date (YYYY-MM-DD)
function intToDate(intDate) {
  if (!intDate) return null;
  const dateStr = intDate.toString();
  if (dateStr.length !== 8) return null;
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return `${year}-${month}-${day}`;
}

// Helper function to convert date string (YYYY-MM-DD) to integer (YYYYMMDD)
function dateToInt(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return parseInt(`${year}${month}${day}`);
}

// All routes require authentication and veterinarian role
router.use(authMiddleware, veterinarianOnly);

// Get assigned farms with withdrawal data
router.get('/assigned-farms/withdrawals', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        f.farm_id, 
        f.farm_name, 
        f.farmer_name,
        f.location,
        COUNT(DISTINCT ab.entity_id) as animal_count,
        SUM(CASE WHEN ar.safe_date > NOW() THEN 1 ELSE 0 END) as active_withdrawals,
        SUM(CASE WHEN ar.safe_date IS NULL THEN 1 ELSE 0 END) as animals_treated
      FROM farms f
      JOIN animals_or_batches ab ON f.farm_id = ab.farm_id
      LEFT JOIN amu_records ar ON ab.entity_id = ar.entity_id
      WHERE f.vet_id = ?
      GROUP BY f.farm_id, f.farm_name, f.farmer_name, f.location
      ORDER BY f.farm_name
    `;
    
    db.query(query, [req.user.user_id], (err, results) => {
      if (err) {
        console.error('Error fetching assigned farms:', err);
        return res.status(500).json({ error: 'Failed to fetch farms' });
      }
      res.json(results || []);
    });
  } catch (error) {
    console.error('Get assigned farms error:', error);
    res.status(500).json({ error: 'Failed to fetch assigned farms' });
  }
});

// Get withdrawal status for specific farm
router.get('/farm/:farmId/withdrawals', async (req, res) => {
  try {
    // Verify vet is assigned to this farm
    const farmQuery = 'SELECT * FROM farms WHERE farm_id = ? AND vet_id = ?';
    db.query(farmQuery, [req.params.farmId, req.user.user_id], async (err, farmResults) => {
      if (err || !farmResults || farmResults.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const query = `
        SELECT 
          ab.entity_id,
          ab.tag_id,
          ab.batch_name,
          ab.species,
          ar.amu_id,
          ar.medicine,
          ar.dosage,
          ar.dose_unit,
          ar.application_date,
          ar.withdrawal_period_days,
          ar.safe_date,
          ar.status,
          DATEDIFF(ar.safe_date, NOW()) as days_until_safe
        FROM animals_or_batches ab
        LEFT JOIN amu_records ar ON ab.entity_id = ar.entity_id
        WHERE ab.farm_id = ?
        ORDER BY ab.tag_id, ar.application_date DESC
      `;
      
      db.query(query, [req.params.farmId], (err, results) => {
        if (err) {
          console.error('Error fetching farm withdrawals:', err);
          return res.status(500).json({ error: 'Failed to fetch withdrawal data' });
        }
        res.json(results || []);
      });
    });
  } catch (error) {
    console.error('Get farm withdrawals error:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawal data' });
  }
});

// Record treatment on assigned farm
router.post('/farm/:farmId/record', async (req, res) => {
  try {
    // Verify vet is assigned to this farm
    const farmQuery = 'SELECT * FROM farms WHERE farm_id = ? AND vet_id = ?';
    db.query(farmQuery, [req.params.farmId, req.user.user_id], async (err, farmResults) => {
      if (err || !farmResults || farmResults.length === 0) {
        return res.status(403).json({ error: 'Access denied - farm not assigned' });
      }

      const {
        entity_id,
        medicine,
        dosage,
        dose_unit,
        frequency_per_day,
        duration_days,
        route,
        reason,
        diagnosis,
        application_date,
        withdrawal_period_days,
        is_vaccine,
        vaccine_interval_days,
        vaccine_total_months
      } = req.body;

      // Validate required fields
      if (!entity_id || !medicine || !dosage || !application_date) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Verify entity belongs to this farm
      const entityQuery = 'SELECT * FROM animals_or_batches WHERE entity_id = ? AND farm_id = ?';
      db.query(entityQuery, [entity_id, req.params.farmId], async (err, entityResults) => {
        if (err || !entityResults || entityResults.length === 0) {
          return res.status(403).json({ error: 'Entity not found on this farm' });
        }

        const entity = entityResults[0];

        try {
          // Create treatment record
          const treatmentData = {
            entity_id,
            medicine,
            dosage,
            dose_unit,
            frequency_per_day,
            duration_days,
            route,
            reason,
            diagnosis,
            vet_id: req.user.user_id,
            vet_name: req.user.display_name,
            is_vaccine: is_vaccine || false,
            vaccine_interval_days,
            vaccine_total_months
          };

          const treatment = await Treatment.create(treatmentData);

          // If not a vaccine, create AMU record
          if (!is_vaccine) {
            const appDateInt = dateToInt(application_date);
            const safeDate = calculateSafeDate(application_date, withdrawal_period_days || 0);

            const amuData = {
              entity_id,
              vet_id: req.user.user_id,
              vet_name: req.user.display_name,
              medicine,
              active_ingredient: medicine,
              dosage,
              dose_unit,
              frequency_per_day,
              duration_days,
              route,
              application_date: appDateInt,
              withdrawal_period_days: withdrawal_period_days || 0,
              safe_date: safeDate,
              species: entity.species,
              status: 'Safe'
            };

            // Predict tissue-wise MRL status
            const tissuePrediction = await predictTissueMrl(
              medicine,
              entity.species,
              dosage,
              withdrawal_period_days || 0
            );

            if (tissuePrediction) {
              amuData.tissue_prediction = JSON.stringify(tissuePrediction);
              // Set overall status based on tissue predictions
              const hasSafe = Object.values(tissuePrediction).some(t => t.status === 'Safe');
              const hasUnsafe = Object.values(tissuePrediction).some(t => t.status === 'Unsafe');
              if (hasUnsafe) {
                amuData.status = 'Unsafe';
              } else if (!hasSafe) {
                amuData.status = 'Borderline';
              }
            }

            await AMU.create(amuData);
          }

          res.status(201).json({
            treatment_id: treatment.treatment_id,
            message: 'Treatment recorded successfully',
            treatment
          });
        } catch (error) {
          console.error('Error creating treatment:', error);
          res.status(500).json({ error: 'Failed to record treatment' });
        }
      });
    });
  } catch (error) {
    console.error('Record treatment error:', error);
    res.status(500).json({ error: 'Failed to record treatment' });
  }
});

// Get entities on assigned farm for treatment recording
router.get('/farm/:farmId/entities', async (req, res) => {
  try {
    // Verify vet is assigned to this farm
    const farmQuery = 'SELECT * FROM farms WHERE farm_id = ? AND vet_id = ?';
    db.query(farmQuery, [req.params.farmId, req.user.user_id], (err, farmResults) => {
      if (err || !farmResults || farmResults.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const query = `
        SELECT 
          entity_id,
          tag_id,
          batch_name,
          species,
          age_months,
          weight_kg
        FROM animals_or_batches
        WHERE farm_id = ?
        ORDER BY tag_id
      `;

      db.query(query, [req.params.farmId], (err, results) => {
        if (err) {
          console.error('Error fetching entities:', err);
          return res.status(500).json({ error: 'Failed to fetch entities' });
        }
        res.json(results || []);
      });
    });
  } catch (error) {
    console.error('Get entities error:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

// Get treatment history for entity
router.get('/entity/:entityId/history', async (req, res) => {
  try {
    const query = `
      SELECT 
        t.treatment_id,
        t.medicine,
        t.dosage,
        t.dose_unit,
        t.frequency_per_day,
        t.duration_days,
        t.route,
        t.reason,
        t.diagnosis,
        t.vet_name,
        ar.application_date,
        ar.safe_date,
        ar.status,
        DATEDIFF(ar.safe_date, NOW()) as days_until_safe
      FROM treatment_records t
      LEFT JOIN amu_records ar ON t.treatment_id = ar.treatment_id
      WHERE t.entity_id = ?
      ORDER BY ar.application_date DESC
      LIMIT 20
    `;

    db.query(query, [req.params.entityId], (err, results) => {
      if (err) {
        console.error('Error fetching treatment history:', err);
        return res.status(500).json({ error: 'Failed to fetch history' });
      }
      res.json(results || []);
    });
  } catch (error) {
    console.error('Get entity history error:', error);
    res.status(500).json({ error: 'Failed to fetch treatment history' });
  }
});

// Get upcoming safe dates for assigned farms
router.get('/upcoming/safe-dates', async (req, res) => {
  try {
    const query = `
      SELECT 
        f.farm_id,
        f.farm_name,
        ab.entity_id,
        ab.tag_id,
        ab.batch_name,
        ab.species,
        ar.medicine,
        ar.application_date,
        ar.safe_date,
        DATEDIFF(ar.safe_date, NOW()) as days_until_safe
      FROM farms f
      JOIN animals_or_batches ab ON f.farm_id = ab.farm_id
      JOIN amu_records ar ON ab.entity_id = ar.entity_id
      WHERE f.vet_id = ? 
        AND ar.safe_date IS NOT NULL
        AND ar.safe_date > NOW()
        AND DATEDIFF(ar.safe_date, NOW()) <= 7
      ORDER BY ar.safe_date ASC
    `;

    db.query(query, [req.user.user_id], (err, results) => {
      if (err) {
        console.error('Error fetching upcoming dates:', err);
        return res.status(500).json({ error: 'Failed to fetch upcoming dates' });
      }
      res.json(results || []);
    });
  } catch (error) {
    console.error('Get upcoming safe dates error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming dates' });
  }
});

module.exports = router;
