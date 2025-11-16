const express = require('express');
const router = express.Router();
const Monitoring = require('../models/Monitoring');

// Dashboard stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await Monitoring.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// AML Routes
router.get('/aml', async (req, res) => {
  try {
    const records = await Monitoring.getAllAML();
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch AML records' });
  }
});

router.get('/aml/crop/:cropId', async (req, res) => {
  try {
    const records = await Monitoring.getAMLByCropId(req.params.cropId);
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch AML records' });
  }
});

router.post('/aml', async (req, res) => {
  try {
    const recordId = await Monitoring.createAML(req.body);
    res.status(201).json({ id: recordId, message: 'AML record created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create AML record' });
  }
});

// MRL Routes
router.get('/mrl', async (req, res) => {
  try {
    const records = await Monitoring.getAllMRL();
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch MRL records' });
  }
});

router.get('/mrl/crop/:cropId', async (req, res) => {
  try {
    const records = await Monitoring.getMRLByCropId(req.params.cropId);
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch MRL records' });
  }
});

router.post('/mrl', async (req, res) => {
  try {
    const recordId = await Monitoring.createMRL(req.body);
    res.status(201).json({ id: recordId, message: 'MRL record created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create MRL record' });
  }
});

module.exports = router;
