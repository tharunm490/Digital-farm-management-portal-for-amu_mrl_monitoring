const express = require('express');
const router = express.Router();
const Treatment = require('../models/Treatment');
const AMU = require('../models/AMU');
const Entity = require('../models/Entity');
const MRL = require('../models/MRL');
const { authMiddleware, farmerOnly } = require('../middleware/auth');

// All routes require authentication and farmer role
router.use(authMiddleware, farmerOnly);

// Get all treatments for logged-in farmer
router.get('/', async (req, res) => {
  try {
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }
    
    const treatments = await Treatment.getByFarmer(farmer.farmer_id);
    res.json(treatments);
  } catch (error) {
    console.error('Get treatments error:', error);
    res.status(500).json({ error: 'Failed to fetch treatments' });
  }
});

// Get recent treatments (last 30 days by default)
router.get('/recent', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }
    
    const treatments = await Treatment.getRecent(farmer.farmer_id, days);
    res.json(treatments);
  } catch (error) {
    console.error('Get recent treatments error:', error);
    res.status(500).json({ error: 'Failed to fetch recent treatments' });
  }
});

// Get treatments for specific entity
router.get('/entity/:entityId', async (req, res) => {
  try {
    // Verify entity ownership
    const entity = await Entity.getById(req.params.entityId);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    const farm = await require('../models/Farm').getById(entity.farm_id);
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
    
    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const treatments = await Treatment.getByEntity(req.params.entityId);
    res.json(treatments);
  } catch (error) {
    console.error('Get entity treatments error:', error);
    res.status(500).json({ error: 'Failed to fetch entity treatments' });
  }
});

// Get single treatment with AMU records
router.get('/:treatmentId', async (req, res) => {
  try {
    const treatment = await Treatment.getWithAMU(req.params.treatmentId);
    
    if (!treatment) {
      return res.status(404).json({ error: 'Treatment not found' });
    }

    // Verify ownership through entity
    const entity = await Entity.getById(treatment.entity_id);
    const farm = await require('../models/Farm').getById(entity.farm_id);
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
    
    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(treatment);
  } catch (error) {
    console.error('Get treatment error:', error);
    res.status(500).json({ error: 'Failed to fetch treatment' });
  }
});

// Create new treatment with optional AMU records
router.post('/', async (req, res) => {
  try {
    const { entity_id, active_ingredient, dose_mg_per_kg, route, frequency_per_day, duration_days, start_date, end_date, withdrawal_period_days } = req.body;

    // Verify entity exists and belongs to farmer
    const entity = await Entity.getById(entity_id);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    const farm = await require('../models/Farm').getById(entity.farm_id);
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
    
    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate required fields
    if (!entity_id || !active_ingredient || !start_date) {
      return res.status(400).json({ error: 'entity_id, active_ingredient, and start_date are required' });
    }

    // Create treatment
    const treatmentId = await Treatment.create({
      entity_id,
      user_id: req.user.user_id,
      active_ingredient,
      dose_mg_per_kg,
      route,
      frequency_per_day,
      duration_days,
      start_date,
      end_date,
      withdrawal_period_days
    });

    const treatment = await Treatment.getById(treatmentId);

    res.status(201).json({
      message: 'Treatment created successfully',
      treatment
    });
  } catch (error) {
    console.error('Create treatment error:', error);
    res.status(500).json({ error: 'Failed to create treatment' });
  }
});

// Add AMU record to existing treatment
router.post('/:treatmentId/amu', async (req, res) => {
  try {
    // Verify treatment exists and belongs to farmer
    const treatment = await Treatment.getById(req.params.treatmentId);
    if (!treatment) {
      return res.status(404).json({ error: 'Treatment not found' });
    }

    const entity = await Entity.getById(treatment.entity_id);
    const farm = await require('../models/Farm').getById(entity.farm_id);
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
    
    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate AMU data
    const { medicine, active_ingredient, dose_mg_per_kg, start_date } = req.body;
    if (!medicine || !dose_mg_per_kg || !start_date) {
      return res.status(400).json({ 
        error: 'medicine, dose_mg_per_kg, and start_date are required' 
      });
    }

    // Check MRL if active ingredient and species provided
    let mrlCheck = null;
    if (active_ingredient && entity.species) {
      const matrix = entity.matrix || 'meat';
      mrlCheck = await MRL.getMRL(entity.species, matrix, active_ingredient);
    }

    const amuId = await AMU.create({
      treatment_id: req.params.treatmentId,
      entity_id: entity.entity_id,
      farm_id: entity.farm_id,
      user_id: req.user.user_id,
      species: entity.species,
      breed: entity.breed,
      ...req.body
    });

    const newAMU = await AMU.getById(amuId);

    res.status(201).json({
      message: 'AMU record added successfully',
      amu_record: newAMU,
      mrl_info: mrlCheck
    });
  } catch (error) {
    console.error('Add AMU record error:', error);
    res.status(500).json({ error: 'Failed to add AMU record' });
  }
});

// Update treatment
router.put('/:treatmentId', async (req, res) => {
  try {
    const treatment = await Treatment.getById(req.params.treatmentId);
    
    if (!treatment) {
      return res.status(404).json({ error: 'Treatment not found' });
    }

    // Verify ownership
    const entity = await Entity.getById(treatment.entity_id);
    const farm = await require('../models/Farm').getById(entity.farm_id);
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
    
    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Treatment.update(req.params.treatmentId, req.body);
    const updatedTreatment = await Treatment.getWithAMU(req.params.treatmentId);

    res.json({
      message: 'Treatment updated successfully',
      treatment: updatedTreatment
    });
  } catch (error) {
    console.error('Update treatment error:', error);
    res.status(500).json({ error: error.message || 'Failed to update treatment' });
  }
});

// Delete treatment
router.delete('/:treatmentId', async (req, res) => {
  try {
    const treatment = await Treatment.getById(req.params.treatmentId);
    
    if (!treatment) {
      return res.status(404).json({ error: 'Treatment not found' });
    }

    // Verify ownership
    const entity = await Entity.getById(treatment.entity_id);
    const farm = await require('../models/Farm').getById(entity.farm_id);
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
    
    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Treatment.delete(req.params.treatmentId);

    res.json({ message: 'Treatment deleted successfully' });
  } catch (error) {
    console.error('Delete treatment error:', error);
    res.status(500).json({ error: 'Failed to delete treatment' });
  }
});

// Get active withdrawals for all entities
router.get('/withdrawals/active', async (req, res) => {
  try {
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }
    
    const withdrawals = await AMU.getActiveWithdrawals(farmer.farmer_id);
    res.json(withdrawals);
  } catch (error) {
    console.error('Get active withdrawals error:', error);
    res.status(500).json({ error: 'Failed to fetch active withdrawals' });
  }
});

module.exports = router;
