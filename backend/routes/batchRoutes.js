const express = require('express');
const router = express.Router();
const Batch = require('../models/Batch');
const Farm = require('../models/Farm');
const { Farmer } = require('../models/User');
const { authMiddleware, farmerOnly } = require('../middleware/auth');

// Get all batches (for authorities)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const batches = await Batch.getAll();
    res.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// Get batches by farm ID
router.get('/farm/:farm_id', authMiddleware, async (req, res) => {
  try {
    const batches = await Batch.getByFarmId(req.params.farm_id);
    res.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// Get batch by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const batch = await Batch.getById(req.params.id);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json(batch);
  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({ error: 'Failed to fetch batch' });
  }
});

// Create new batch
router.post('/', authMiddleware, farmerOnly, async (req, res) => {
  try {
    const { farm_id, species, breed, matrix } = req.body;
    
    // Verify farm belongs to user
    const farm = await Farm.getById(farm_id);
    const farmer = await Farmer.getByUserId(req.user.user_id);
    
    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied to this farm' });
    }
    
    const batchId = await Batch.create({ farm_id, species, breed, matrix });
    res.status(201).json({ id: batchId, message: 'Batch created successfully' });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

// Update batch
router.put('/:id', authMiddleware, farmerOnly, async (req, res) => {
  try {
    const batch = await Batch.getById(req.params.id);
    const farm = await Farm.getById(batch.farm_id);
    const farmer = await Farmer.getByUserId(req.user.user_id);
    
    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const affected = await Batch.update(req.params.id, req.body);
    if (affected === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json({ message: 'Batch updated successfully' });
  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({ error: 'Failed to update batch' });
  }
});

// Delete batch
router.delete('/:id', authMiddleware, farmerOnly, async (req, res) => {
  try {
    const batch = await Batch.getById(req.params.id);
    const farm = await Farm.getById(batch.farm_id);
    const farmer = await Farmer.getByUserId(req.user.user_id);
    
    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const affected = await Batch.delete(req.params.id);
    if (affected === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
});

module.exports = router;
