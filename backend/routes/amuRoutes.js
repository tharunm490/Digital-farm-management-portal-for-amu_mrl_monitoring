const express = require('express');
const router = express.Router();
const AMU = require('../models/AMU');
const Farm = require('../models/Farm');
const { Farmer } = require('../models/User');
const { authMiddleware, farmerOnly } = require('../middleware/auth');

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

// GET /api/amu/farm/:farm_id - Get AMU records by farm
router.get('/farm/:farm_id', authMiddleware, async (req, res) => {
  try {
    const amuRecords = await AMU.getByFarmId(req.params.farm_id);
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
    
    const withdrawalFinishDate = new Date(endDate);
    withdrawalFinishDate.setDate(withdrawalFinishDate.getDate() + parseInt(req.body.withdrawal_period_days));
    const daysFromWithdrawal = Math.floor((today - withdrawalFinishDate) / (1000 * 60 * 60 * 24));
    
    const cumulativeDose = req.body.dose_mg_per_kg * req.body.frequency_per_day * req.body.duration_days;
    
    const amuData = {
      ...req.body,
      user_id: req.user.user_id,
      days_since_last_dose: daysSinceLastDose,
      days_from_withdrawal: daysFromWithdrawal,
      cumulative_dose: cumulativeDose,
      mrl_risk_prob: req.body.mrl_risk_prob || 0,
      mrl_risk_category: req.body.mrl_risk_category || 'Low'
    };
    
    const amuId = await AMU.create(amuData);
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
