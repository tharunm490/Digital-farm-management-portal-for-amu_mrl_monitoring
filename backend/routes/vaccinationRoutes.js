const express = require('express');
const router = express.Router();
const Vaccination = require('../models/Vaccination');
const Entity = require('../models/Entity');
const { authMiddleware, farmerOnly } = require('../middleware/auth');

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

// All routes require authentication and farmer role
router.use(authMiddleware, farmerOnly);

// Get all vaccinations for logged-in farmer
router.get('/', async (req, res) => {
  try {
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }

    const vaccinations = await Vaccination.getByFarmer(farmer.farmer_id);
    res.json(vaccinations);
  } catch (error) {
    console.error('Get vaccinations error:', error);
    res.status(500).json({ error: 'Failed to fetch vaccinations' });
  }
});

// Get vaccinations for specific entity
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

    const vaccinations = await Vaccination.getByEntity(req.params.entityId);
    res.json(vaccinations);
  } catch (error) {
    console.error('Get entity vaccinations error:', error);
    res.status(500).json({ error: 'Failed to fetch entity vaccinations' });
  }
});

// Get single vaccination
router.get('/:vaccinationId', async (req, res) => {
  try {
    const vaccination = await Vaccination.getById(req.params.vaccinationId);

    if (!vaccination) {
      return res.status(404).json({ error: 'Vaccination not found' });
    }

    // Verify ownership through entity
    const entity = await Entity.getById(vaccination.entity_id);
    const farm = await require('../models/Farm').getById(entity.farm_id);
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);

    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(vaccination);
  } catch (error) {
    console.error('Get vaccination error:', error);
    res.status(500).json({ error: 'Failed to fetch vaccination' });
  }
});

// Create new vaccination
router.post('/', async (req, res) => {
  try {
    const {
      entity_id,
      vaccine_name,
      vaccination_date,
      next_due_date,
      batch_number,
      manufacturer,
      vet_id,
      vet_name,
      dosage,
      route,
      notes
    } = req.body;

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
    if (!entity_id || !vaccine_name || !vaccination_date || !route) {
      return res.status(400).json({ error: 'entity_id, vaccine_name, vaccination_date, and route are required' });
    }

    // Create vaccination
    const vaccinationId = await Vaccination.create({
      entity_id,
      vaccine_name,
      vaccination_date: intToDate(vaccination_date),
      next_due_date: intToDate(next_due_date),
      batch_number,
      manufacturer,
      vet_id,
      vet_name,
      dosage,
      route,
      notes,
      user_id: req.user.user_id
    });

    const vaccination = await Vaccination.getById(vaccinationId);

    res.status(201).json({
      message: 'Vaccination record created successfully',
      vaccination
    });
  } catch (error) {
    console.error('Create vaccination error:', error);
    res.status(500).json({ error: 'Failed to create vaccination record' });
  }
});

// Update vaccination
router.put('/:vaccinationId', async (req, res) => {
  try {
    const vaccination = await Vaccination.getById(req.params.vaccinationId);

    if (!vaccination) {
      return res.status(404).json({ error: 'Vaccination not found' });
    }

    // Verify ownership
    const entity = await Entity.getById(vaccination.entity_id);
    const farm = await require('../models/Farm').getById(entity.farm_id);
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);

    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Vaccination.update(req.params.vaccinationId, req.body);
    const updatedVaccination = await Vaccination.getById(req.params.vaccinationId);

    res.json({
      message: 'Vaccination updated successfully',
      vaccination: updatedVaccination
    });
  } catch (error) {
    console.error('Update vaccination error:', error);
    res.status(500).json({ error: 'Failed to update vaccination' });
  }
});

// Delete vaccination
router.delete('/:vaccinationId', async (req, res) => {
  try {
    const vaccination = await Vaccination.getById(req.params.vaccinationId);

    if (!vaccination) {
      return res.status(404).json({ error: 'Vaccination not found' });
    }

    // Verify ownership
    const entity = await Entity.getById(vaccination.entity_id);
    const farm = await require('../models/Farm').getById(entity.farm_id);
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);

    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Vaccination.delete(req.params.vaccinationId);

    res.json({ message: 'Vaccination deleted successfully' });
  } catch (error) {
    console.error('Delete vaccination error:', error);
    res.status(500).json({ error: 'Failed to delete vaccination' });
  }
});

// Get upcoming vaccinations
router.get('/upcoming/:days?', async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 30;
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }

    const vaccinations = await Vaccination.getUpcoming(farmer.farmer_id, days);
    res.json(vaccinations);
  } catch (error) {
    console.error('Get upcoming vaccinations error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming vaccinations' });
  }
});

// Vaccination History Routes

// Get vaccination history for logged-in farmer
router.get('/history', async (req, res) => {
  try {
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }

    const VaccinationHistory = require('../models/VaccinationHistory');
    const history = await VaccinationHistory.getByFarmer(farmer.farmer_id);
    res.json(history);
  } catch (error) {
    console.error('Get vaccination history error:', error);
    res.status(500).json({ error: 'Failed to fetch vaccination history' });
  }
});

// Get vaccination history for specific entity
router.get('/history/entity/:entityId', async (req, res) => {
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

    const VaccinationHistory = require('../models/VaccinationHistory');
    const history = await VaccinationHistory.getByEntity(req.params.entityId);
    res.json(history);
  } catch (error) {
    console.error('Get entity vaccination history error:', error);
    res.status(500).json({ error: 'Failed to fetch entity vaccination history' });
  }
});

// Get vaccination history for a treatment
router.get('/history/treatment/:treatmentId', async (req, res) => {
  try {
    const treatment = await require('../models/Treatment').getById(req.params.treatmentId);
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

    const VaccinationHistory = require('../models/VaccinationHistory');
    const history = await VaccinationHistory.getByTreatment(req.params.treatmentId);
    res.json(history);
  } catch (error) {
    console.error('Get treatment vaccination history error:', error);
    res.status(500).json({ error: 'Failed to fetch treatment vaccination history' });
  }
});

// Mark vaccination as given (create new vaccination history entry)
router.post('/history/:vaccId/mark-done', async (req, res) => {
  try {
    const VaccinationHistory = require('../models/VaccinationHistory');
    const vacc = await VaccinationHistory.getById(req.params.vaccId);
    if (!vacc) {
      return res.status(404).json({ error: 'Vaccination history entry not found' });
    }

    // Verify ownership through treatment
    const treatment = await require('../models/Treatment').getById(vacc.treatment_id);
    if (!treatment) {
      return res.status(404).json({ error: 'Treatment not found' });
    }

    const entity = await Entity.getById(treatment.entity_id);
    const farm = await require('../models/Farm').getById(entity.farm_id);
    const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);

    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if vaccination is due
    const today = new Date().toISOString().split('T')[0];
    if (today < vacc.next_due_date) {
      return res.status(400).json({ error: 'Vaccination is not due yet' });
    }

    // Check if vaccination cycle is completed
    if (today >= vacc.vaccine_end_date) {
      return res.status(400).json({ error: 'Vaccination cycle is already completed' });
    }

    // Calculate next due date
    const givenDate = new Date(today);
    const nextDueDate = new Date(givenDate.getTime() + (vacc.interval_days * 24 * 60 * 60 * 1000));

    // Create new vaccination history entry
    const newVaccId = await VaccinationHistory.create({
      entity_id: vacc.entity_id,
      treatment_id: vacc.treatment_id,
      vaccine_name: vacc.vaccine_name,
      given_date: today,
      interval_days: vacc.interval_days,
      next_due_date: nextDueDate.toISOString().split('T')[0],
      vaccine_total_months: vacc.vaccine_total_months,
      vaccine_end_date: vacc.vaccine_end_date
    });

    const newEntry = await VaccinationHistory.getById(newVaccId);
    res.status(201).json({
      message: 'Vaccination marked as given',
      vaccination: newEntry
    });
  } catch (error) {
    console.error('Mark vaccination done error:', error);
    res.status(500).json({ error: 'Failed to mark vaccination as done' });
  }
});

module.exports = router;