const express = require('express');
const router = express.Router();
const Crop = require('../models/Crop');

// Get all crops
router.get('/', async (req, res) => {
  try {
    const crops = await Crop.getAll();
    res.json(crops);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch crops' });
  }
});

// Get crop by ID
router.get('/:id', async (req, res) => {
  try {
    const crop = await Crop.getById(req.params.id);
    if (!crop) {
      return res.status(404).json({ error: 'Crop not found' });
    }
    res.json(crop);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch crop' });
  }
});

// Get crops by farm ID
router.get('/farm/:farmId', async (req, res) => {
  try {
    const crops = await Crop.getByFarmId(req.params.farmId);
    res.json(crops);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch crops' });
  }
});

// Create new crop
router.post('/', async (req, res) => {
  try {
    const cropId = await Crop.create(req.body);
    res.status(201).json({ id: cropId, message: 'Crop created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create crop' });
  }
});

// Update crop
router.put('/:id', async (req, res) => {
  try {
    const affected = await Crop.update(req.params.id, req.body);
    if (affected === 0) {
      return res.status(404).json({ error: 'Crop not found' });
    }
    res.json({ message: 'Crop updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update crop' });
  }
});

// Delete crop
router.delete('/:id', async (req, res) => {
  try {
    const affected = await Crop.delete(req.params.id);
    if (affected === 0) {
      return res.status(404).json({ error: 'Crop not found' });
    }
    res.json({ message: 'Crop deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete crop' });
  }
});

module.exports = router;
