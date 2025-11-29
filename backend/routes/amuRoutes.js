const express = require('express');
const router = express.Router();
const AMU = require('../models/AMU');
const Treatment = require('../models/Treatment');
const Farm = require('../models/Farm');
const { Farmer } = require('../models/User');
const { authMiddleware, farmerOnly } = require('../middleware/auth');

// Prediction endpoint
router.post('/predict', authMiddleware, (req, res) => {
  try {
    const {
      species,
      medication_type,
      medicine,
      dose_amount,
      duration_days,
      frequency_per_day
    } = req.body;

    // Use formula-based calculation instead of ML
    const prediction = Treatment.calculateMRLAndWithdrawal(
      species,
      medication_type,
      medicine,
      dose_amount ? parseFloat(dose_amount) : null,
      duration_days ? parseInt(duration_days) : null,
      frequency_per_day ? parseInt(frequency_per_day) : null
    );

    res.json(prediction);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
});

// GET /api/amu/:batch_id - Fetch AMU records by batch_id
router.get('/:batch_id', authMiddleware, async (req, res) => {
  try {
    const { batch_id } = req.params;
    const amuRecords = await AMU.getByBatchId(batch_id);
    
    if (!amuRecords || amuRecords.length === 0) {
      return res.status(404).json({ error: 'No AMU records found for this batch' });
    }
    
    res.json(amuRecords);
  } catch (error) {
    console.error('Error fetching AMU records:', error);
    res.status(500).json({ error: 'Failed to fetch AMU records' });
  }
});

// GET /api/amu/entity/:entity_id - Get AMU records by entity
router.get('/entity/:entity_id', authMiddleware, async (req, res) => {
  try {
    // Check if user has access to this entity
    const entity = await require('../models/Entity').getById(req.params.entity_id);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    const farm = await Farm.getById(entity.farm_id);
    let hasAccess = false;
    
    if (req.user.role === 'farmer') {
      const farmer = await Farmer.getByUserId(req.user.user_id);
      hasAccess = farmer && farm.farmer_id === farmer.farmer_id;
    } else if (req.user.role === 'veterinarian') {
      const { Veterinarian } = require('../models/User');
      const veterinarian = await Veterinarian.getByUserId(req.user.user_id);
      const VetFarmMapping = require('../models/VetFarmMapping');
      const vetMapping = await VetFarmMapping.getVetsByFarm(farm.farm_id);
      hasAccess = veterinarian && vetMapping.some(mapping => mapping.vet_id === veterinarian.vet_id);
    }
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const amuRecords = await AMU.getByEntity(req.params.entity_id);
    res.json(amuRecords);
  } catch (error) {
    console.error('Error fetching AMU records:', error);
    res.status(500).json({ error: 'Failed to fetch AMU records' });
  }
});

// GET /api/amu/farmer/:farmer_id - Get AMU records by farmer
router.get('/farmer/:farmer_id', authMiddleware, farmerOnly, async (req, res) => {
  try {
    const amuRecords = await AMU.getByFarmer(req.params.farmer_id);
    res.json(amuRecords);
  } catch (error) {
    console.error('Error fetching AMU records:', error);
    res.status(500).json({ error: 'Failed to fetch AMU records' });
  }
});

// GET /api/amu/vet/:vet_id - Get AMU records by vet (mapped farms)
router.get('/vet/:user_id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'veterinarian') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { Veterinarian } = require('../models/User');
    const veterinarian = await Veterinarian.getByUserId(req.params.user_id);
    if (!veterinarian) {
      return res.status(404).json({ error: 'Veterinarian profile not found' });
    }

    const amuRecords = await AMU.getByVet(veterinarian.vet_id);
    res.json(amuRecords);
  } catch (error) {
    console.error('Error fetching AMU records:', error);
    res.status(500).json({ error: 'Failed to fetch AMU records' });
  }
});

// POST /api/amu - Create new AMU record
router.post('/', authMiddleware, farmerOnly, async (req, res) => {
  try {
    // Calculate derived values
    const today = new Date();
    const endDate = new Date(req.body.end_date);
    const daysSinceLastDose = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
    
    // Override withdrawal_period_days for vaccine and vitamin categories
    let effectiveWithdrawalDays = parseInt(req.body.withdrawal_period_days);
    if (req.body.category_type === 'vaccine' || req.body.category_type === 'vitamin') {
      effectiveWithdrawalDays = 0;
    }
    
    const withdrawalFinishDate = new Date(endDate);
    withdrawalFinishDate.setDate(withdrawalFinishDate.getDate() + effectiveWithdrawalDays);
    const daysFromWithdrawal = Math.floor((today - withdrawalFinishDate) / (1000 * 60 * 60 * 24));
    
    const cumulativeDose = req.body.dose_mg_per_kg * req.body.frequency_per_day * req.body.duration_days;

    // Calculate tissue predictions if matrix is meat
    let tissuePrediction = null;
    let overdosage = false;
    let riskCategory = req.body.risk_category || 'Low';
    let predictedMrl = req.body.predicted_mrl || 0;
    let predictedWithdrawalDays = effectiveWithdrawalDays;
    let worstTissue = null;
    let riskPercent = 0;
    let message = '';

    if (req.body.matrix === 'meat') {
      const { predictTissueMrl, checkOverdosage } = require('../utils/amuTissueService');
      tissuePrediction = predictTissueMrl(
        req.body.species,
        req.body.category_type, // medication_type as category
        req.body.medicine,
        req.body.dose_amount,
        req.body.dose_unit,
        req.body.duration_days,
        req.body.matrix,
        req.body.end_date,
        today.toISOString().split('T')[0],
        req.body.frequency_per_day
      );

      if (tissuePrediction) {
        riskCategory = tissuePrediction.overall_risk_category;
        predictedMrl = tissuePrediction.predicted_mrl;
        predictedWithdrawalDays = tissuePrediction.predicted_withdrawal_days;
        worstTissue = tissuePrediction.worst_tissue;
        // Find the risk_percent of the worst tissue
        riskPercent = tissuePrediction.tissues[worstTissue].risk_percent;
        overdosage = tissuePrediction.overdosage;
        message = tissuePrediction.message;
      }
    }
    
    const amuData = {
      ...req.body,
      user_id: req.user.user_id,
      days_since_last_dose: daysSinceLastDose,
      days_from_withdrawal: daysFromWithdrawal,
      cumulative_dose: cumulativeDose,
      mrl_risk_prob: req.body.mrl_risk_prob || 0,
      mrl_risk_category: riskCategory,
      predicted_mrl: predictedMrl,
      predicted_withdrawal_days: predictedWithdrawalDays,
      overdosage: overdosage,
      message: message,
      worst_tissue: worstTissue,
      risk_percent: riskPercent
    };
    
    const amuId = await AMU.create(amuData);

    // Insert tissue results if available
    if (tissuePrediction && tissuePrediction.tissues) {
      const TissueResult = require('../models/TissueResult');
      for (const [tissue, data] of Object.entries(tissuePrediction.tissues)) {
        await TissueResult.create({
          amu_id: amuId,
          tissue,
          predicted_mrl: data.predicted_mrl,
          base_mrl: data.base_mrl,
          risk_percent: data.risk_percent,
          risk_category: data.risk_category
        });
      }
    }

    res.status(201).json({ id: amuId, message: 'AMU record created successfully' });
  } catch (error) {
    console.error('Error creating AMU record:', error);
    res.status(500).json({ error: 'Failed to create AMU record' });
  }
});

// PUT /api/amu/:id - Update AMU record
router.put('/:id', authMiddleware, farmerOnly, async (req, res) => {
  try {
    const affected = await AMU.update(req.params.id, req.body);
    if (affected === 0) {
      return res.status(404).json({ error: 'AMU record not found' });
    }
    res.json({ message: 'AMU record updated successfully' });
  } catch (error) {
    console.error('Error updating AMU record:', error);
    res.status(500).json({ error: 'Failed to update AMU record' });
  }
});

// DELETE /api/amu/:id - Delete AMU record
router.delete('/:id', authMiddleware, farmerOnly, async (req, res) => {
  try {
    const affected = await AMU.delete(req.params.id);
    if (affected === 0) {
      return res.status(404).json({ error: 'AMU record not found' });
    }
    res.json({ message: 'AMU record deleted successfully' });
  } catch (error) {
    console.error('Error deleting AMU record:', error);
    res.status(500).json({ error: 'Failed to delete AMU record' });
  }
});

module.exports = router;
