const express = require('express');
const router = express.Router();
const Entity = require('../models/Entity');
const { authMiddleware, farmerOnly, veterinarianOnly } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get all entities (filtered by role)
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'farmer') {
      const { Farmer } = require('../models/User');
      const farmer = await Farmer.getByUserId(req.user.user_id);
      
      if (!farmer) {
        return res.status(404).json({ error: 'Farmer profile not found' });
      }
      
      const entities = await Entity.getAllByFarmer(farmer.farmer_id);
      res.json(entities);
    } else if (req.user.role === 'veterinarian') {
      const { Veterinarian } = require('../models/User');
      const veterinarian = await Veterinarian.getByUserId(req.user.user_id);
      
      if (!veterinarian) {
        return res.status(404).json({ error: 'Veterinarian profile not found' });
      }
      
      const entities = await Entity.getAllByVet(veterinarian.vet_id);
      res.json(entities);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Get entities error:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

// Get entities by farm
router.get('/farm/:farmName', async (req, res) => {
  try {
    const { Farmer } = require('../models/User');
    const farmer = await Farmer.getByUserId(req.user.user_id);
    
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }
    
    const entities = await Entity.getByFarmName(farmer.farmer_id, req.params.farmName);
    res.json(entities);
  } catch (error) {
    console.error('Get entities by farm error:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

// Get entities by type (animal or batch)
router.get('/type/:entityType', async (req, res) => {
  try {
    const { entityType } = req.params;
    if (!['animal', 'batch'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type. Must be "animal" or "batch"' });
    }
    
    const { Farmer } = require('../models/User');
    const farmer = await Farmer.getByUserId(req.user.user_id);
    
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }
    
    const entities = await Entity.getByType(farmer.farmer_id, entityType);
    res.json(entities);
  } catch (error) {
    console.error('Get entities by type error:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

// Get single entity with history
router.get('/:entityId', async (req, res) => {
  try {
    const entityData = await Entity.getWithHistory(req.params.entityId);
    
    if (!entityData) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Check ownership based on role
    const farm = await require('../models/Farm').getById(entityData.entity.farm_id);
    let hasAccess = false;
    
    if (req.user.role === 'farmer') {
      const { Farmer } = require('../models/User');
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

    res.json(entityData);
  } catch (error) {
    console.error('Get entity error:', error);
    res.status(500).json({ error: 'Failed to fetch entity' });
  }
});

// Create new entity
router.post('/', farmerOnly, async (req, res) => {
  try {
    const entityData = {
      ...req.body,
      farmer_id: req.user.farmer_id
    };

    // Validate entity type
    if (!['animal', 'batch'].includes(entityData.entity_type)) {
      return res.status(400).json({ error: 'entity_type must be "animal" or "batch"' });
    }

    // Validate entity-specific fields
    if (entityData.entity_type === 'animal' && !entityData.tag_id) {
      return res.status(400).json({ error: 'tag_id is required for animals' });
    }

    if (entityData.entity_type === 'batch' && !entityData.batch_name) {
      return res.status(400).json({ error: 'batch_name is required for batches' });
    }

    // Required fields
    if (!entityData.species || !entityData.farm_id || !entityData.matrix) {
      return res.status(400).json({ 
        error: 'species, farm_id, and matrix (product) are required' 
      });
    }

    const entityId = await Entity.create(entityData);
    const newEntity = await Entity.getById(entityId);

    res.status(201).json({
      message: 'Entity created successfully',
      entity: newEntity
    });
  } catch (error) {
    console.error('Create entity error:', error);
    res.status(500).json({ error: 'Failed to create entity' });
  }
});

// Update entity
router.put('/:entityId', farmerOnly, async (req, res) => {
  try {
    const entity = await Entity.getById(req.params.entityId);
    
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Check ownership
    const farm = await require('../models/Farm').getById(entity.farm_id);
    const { Farmer } = require('../models/User');
    const farmer = await Farmer.getByUserId(req.user.user_id);
    
    if (!farmer || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Entity.update(req.params.entityId, req.body);
    const updatedEntity = await Entity.getById(req.params.entityId);

    res.json({
      message: 'Entity updated successfully',
      entity: updatedEntity
    });
  } catch (error) {
    console.error('Update entity error:', error);
    res.status(500).json({ error: error.message || 'Failed to update entity' });
  }
});

// Delete entity
router.delete('/:entityId', farmerOnly, async (req, res) => {
  try {
    const entity = await Entity.getById(req.params.entityId);
    
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Check ownership
    const farm = await require('../models/Farm').getById(entity.farm_id);
    const { Farmer } = require('../models/User');
    const farmer = await Farmer.getByUserId(req.user.user_id);
    
    if (!farmer || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Entity.delete(req.params.entityId);

    res.json({ message: 'Entity deleted successfully' });
  } catch (error) {
    console.error('Delete entity error:', error);
    res.status(500).json({ error: 'Failed to delete entity' });
  }
});

// Search entities
router.post('/search', async (req, res) => {
  try {
    const entities = await Entity.search(req.user.farmer_id, req.body);
    res.json(entities);
  } catch (error) {
    console.error('Search entities error:', error);
    res.status(500).json({ error: 'Failed to search entities' });
  }
});

module.exports = router;
