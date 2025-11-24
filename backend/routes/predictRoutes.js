const express = require('express');
const router = express.Router();
const Treatment = require('../models/Treatment');

router.post('/', (req, res) => {
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

module.exports = router;