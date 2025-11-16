const express = require('express');
const router = express.Router();
const Farm = require('../models/Farm');
const { Farmer } = require('../models/User');
const { authMiddleware, farmerOnly } = require('../middleware/auth');

// Get all farms (filtered by role)
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'farmer') {
      // Farmers only see their own farms
      const farmer = await Farmer.getByUserId(req.user.user_id);
      
      if (!farmer) {
        return res.status(404).json({ error: 'Farmer profile not found' });
      }
      
      const farms = await Farm.getByFarmerId(farmer.farmer_id);
      res.json(farms);
    } else {
      // Authorities see all farms
      const farms = await Farm.getAll();
      res.json(farms);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch farms' });
  }
});

// Get farms for logged-in farmer
router.get('/my-farms', authMiddleware, farmerOnly, async (req, res) => {
  try {
    // Get farmer_id from user_id
    const farmer = await Farmer.getByUserId(req.user.user_id);
    
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }
    
    const farms = await Farm.getByFarmerId(farmer.farmer_id);
    res.json(farms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch farms' });
  }
});

// Get farm by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const farm = await Farm.getById(req.params.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }
    res.json(farm);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch farm' });
  }
});

// Create new farm
router.post('/', authMiddleware, farmerOnly, async (req, res) => {
  try {
    // Get farmer_id from user_id
    const farmer = await Farmer.getByUserId(req.user.user_id);
    
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found. Please complete your profile first.' });
    }
    
    const farmData = {
      farmer_id: farmer.farmer_id,
      farm_name: req.body.farm_name,
      latitude: req.body.latitude,
      longitude: req.body.longitude
    };
    
    const farmId = await Farm.create(farmData);
    res.status(201).json({ id: farmId, message: 'Farm created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create farm' });
  }
});

// Update farm
router.put('/:id', authMiddleware, farmerOnly, async (req, res) => {
  try {
    // Verify farm belongs to user
    const farm = await Farm.getById(req.params.id);
    const farmer = await Farmer.getByUserId(req.user.user_id);
    
    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const affected = await Farm.update(req.params.id, req.body);
    if (affected === 0) {
      return res.status(404).json({ error: 'Farm not found' });
    }
    res.json({ message: 'Farm updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update farm' });
  }
});

// Delete farm
router.delete('/:id', authMiddleware, farmerOnly, async (req, res) => {
  try {
    // Verify farm belongs to user
    const farm = await Farm.getById(req.params.id);
    const farmer = await Farmer.getByUserId(req.user.user_id);
    
    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const affected = await Farm.delete(req.params.id);
    if (affected === 0) {
      return res.status(404).json({ error: 'Farm not found' });
    }
    res.json({ message: 'Farm deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete farm' });
  }
});

module.exports = router;
