const express = require('express');
const router = express.Router();
const Vaccination = require('../models/Vaccination');
const Entity = require('../models/Entity');
const { authMiddleware } = require('../middleware/auth');

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

// All routes require authentication
router.use(authMiddleware);

// Helper function to check if user has access to farm
async function checkFarmAccess(user, farmId) {
  if (user.role === 'farmer') {
    const farmer = await require('../models/User').Farmer.getByUserId(user.user_id);
    return farmer && farmer.farmer_id === farmId;
  } else if (user.role === 'veterinarian') {
    const VetFarmMapping = require('../models/VetFarmMapping');
    const mapping = await VetFarmMapping.getVetForFarm(farmId);
    const vet = await require('../models/User').Veterinarian.getByUserId(user.user_id);
    return mapping && mapping.vet_id === vet.vet_id;
  }
  return false;
}

// Get all vaccinations for logged-in user (farmer or vet)
router.get('/', async (req, res) => {
  try {
    let vaccinations = [];
    
    if (req.user.role === 'farmer') {
      const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
      if (!farmer) {
        return res.status(404).json({ error: 'Farmer profile not found' });
      }
      vaccinations = await Vaccination.getByFarmer(farmer.farmer_id);
    } else if (req.user.role === 'veterinarian') {
      const vet = await require('../models/User').Veterinarian.getByUserId(req.user.user_id);
      if (!vet) {
        return res.status(404).json({ error: 'Veterinarian profile not found' });
      }
      vaccinations = await Vaccination.getByVet(vet.vet_id);
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(vaccinations);
  } catch (error) {
    console.error('Get vaccinations error:', error);
    res.status(500).json({ error: 'Failed to fetch vaccinations' });
  }
});

// Get vaccinations for specific entity
router.get('/entity/:entityId', async (req, res) => {
  try {
    // Verify entity exists
    const entity = await Entity.getById(req.params.entityId);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Check if user has access to the farm
    const hasAccess = await checkFarmAccess(req.user, entity.farm_id);
    if (!hasAccess) {
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
router.get('/:treatmentId', async (req, res) => {
  try {
    const vaccination = await Vaccination.getById(req.params.treatmentId);

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
router.put('/:treatmentId', async (req, res) => {
  try {
    const vaccination = await Vaccination.getById(req.params.treatmentId);

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

    await Vaccination.update(req.params.treatmentId, req.body);
    const updatedVaccination = await Vaccination.getById(req.params.treatmentId);

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
router.delete('/:treatmentId', async (req, res) => {
  try {
    const vaccination = await Vaccination.getById(req.params.treatmentId);

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

    await Vaccination.delete(req.params.treatmentId);

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
    let farmerId = null;
    let vetId = null;
    
    if (req.user.role === 'farmer') {
      const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
      if (!farmer) {
        return res.status(404).json({ error: 'Farmer profile not found' });
      }
      farmerId = farmer.farmer_id;
    } else if (req.user.role === 'veterinarian') {
      const vet = await require('../models/User').Veterinarian.getByUserId(req.user.user_id);
      if (!vet) {
        return res.status(404).json({ error: 'Veterinarian profile not found' });
      }
      vetId = vet.vet_id;
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    let vaccinations = [];
    let upcomingHistory = [];
    
    if (farmerId) {
      // For farmers: get vaccinations for their own farms
      vaccinations = await Vaccination.getUpcoming(farmerId, days);
      const VaccinationHistory = require('../models/VaccinationHistory');
      upcomingHistory = await VaccinationHistory.getUpcomingVaccinations(farmerId, days);
    } else if (vetId) {
      // For vets: get vaccinations for farms they're mapped to
      const VetFarmMapping = require('../models/VetFarmMapping');
      const farmMappings = await VetFarmMapping.getFarmsByVet(vetId);
      
      for (const mapping of farmMappings) {
        const farmVaccinations = await Vaccination.getUpcoming(mapping.farmer_id, days);
        vaccinations = vaccinations.concat(farmVaccinations);
        
        const VaccinationHistory = require('../models/VaccinationHistory');
        const farmUpcomingHistory = await VaccinationHistory.getUpcomingVaccinations(mapping.farmer_id, days);
        upcomingHistory = upcomingHistory.concat(farmUpcomingHistory);
      }
    }
    
    // Create notifications for upcoming scheduled vaccinations
    for (const vacc of upcomingHistory) {
      // Check if notification already exists for this vaccination today
      const existingNotificationQuery = `
        SELECT * FROM notification_history 
        WHERE user_id = ? 
        AND type = 'vaccination' 
        AND vacc_id = ? 
        AND DATE(created_at) = CURDATE()
      `;
      const [existing] = await require('../config/database').execute(existingNotificationQuery, [req.user.user_id, vacc.vacc_id]);
      
      if (existing.length === 0) {
        // Create notification for upcoming scheduled vaccination
        await require('./Notification').create({
          user_id: req.user.user_id,
          type: 'vaccination',
          message: `Upcoming vaccination: ${vacc.vaccine_name} for ${vacc.species} ${vacc.tag_id || vacc.batch_name} is due in ${vacc.days_until_due} days (${vacc.next_due_date}).`,
          entity_id: vacc.entity_id,
          treatment_id: vacc.treatment_id,
          vacc_id: vacc.vacc_id
        });
      }
    }

    res.json(vaccinations);
  } catch (error) {
    console.error('Get upcoming vaccinations error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming vaccinations' });
  }
});

// Get overdue vaccinations
router.get('/overdue', async (req, res) => {
  try {
    let farmerId = null;
    let vetId = null;
    
    if (req.user.role === 'farmer') {
      const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
      if (!farmer) {
        return res.status(404).json({ error: 'Farmer profile not found' });
      }
      farmerId = farmer.farmer_id;
    } else if (req.user.role === 'veterinarian') {
      const vet = await require('../models/User').Veterinarian.getByUserId(req.user.user_id);
      if (!vet) {
        return res.status(404).json({ error: 'Veterinarian profile not found' });
      }
      vetId = vet.vet_id;
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    let vaccinations = [];
    let overdueHistory = [];
    
    if (farmerId) {
      // For farmers: get vaccinations for their own farms
      vaccinations = await Vaccination.getOverdue(farmerId);
      const VaccinationHistory = require('../models/VaccinationHistory');
      overdueHistory = await VaccinationHistory.getOverdueVaccinations(farmerId);
    } else if (vetId) {
      // For vets: get vaccinations for farms they're mapped to
      const VetFarmMapping = require('../models/VetFarmMapping');
      const farmMappings = await VetFarmMapping.getFarmsByVet(vetId);
      
      for (const mapping of farmMappings) {
        const farmVaccinations = await Vaccination.getOverdue(mapping.farmer_id);
        vaccinations = vaccinations.concat(farmVaccinations);
        
        const VaccinationHistory = require('../models/VaccinationHistory');
        const farmOverdueHistory = await VaccinationHistory.getOverdueVaccinations(mapping.farmer_id);
        overdueHistory = overdueHistory.concat(farmOverdueHistory);
      }
    }
    
    // Create notifications for overdue scheduled vaccinations
    for (const vacc of overdueHistory) {
      // Check if notification already exists for this vaccination today
      const existingNotificationQuery = `
        SELECT * FROM notification_history 
        WHERE user_id = ? 
        AND type = 'vaccination' 
        AND vacc_id = ? 
        AND message LIKE 'Overdue%'
        AND DATE(created_at) = CURDATE()
      `;
      const [existing] = await require('../config/database').execute(existingNotificationQuery, [req.user.user_id, vacc.vacc_id]);
      
      if (existing.length === 0) {
        // Create notification for overdue scheduled vaccination
        await require('./Notification').create({
          user_id: req.user.user_id,
          type: 'vaccination',
          message: `Overdue vaccination: ${vacc.vaccine_name} for ${vacc.species} ${vacc.tag_id || vacc.batch_name} was due ${vacc.days_overdue} days ago (${vacc.next_due_date}).`,
          entity_id: vacc.entity_id,
          treatment_id: vacc.treatment_id,
          vacc_id: vacc.vacc_id
        });
      }
    }

    res.json(vaccinations);
  } catch (error) {
    console.error('Get overdue vaccinations error:', error);
    res.status(500).json({ error: 'Failed to fetch overdue vaccinations' });
  }
});

// Vaccination History Routes

// Get vaccination history for logged-in user (farmer or vet)
router.get('/history', async (req, res) => {
  try {
    const VaccinationHistory = require('../models/VaccinationHistory');
    let history = [];
    
    if (req.user.role === 'farmer') {
      const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
      if (!farmer) {
        return res.status(404).json({ error: 'Farmer profile not found' });
      }
      history = await VaccinationHistory.getByFarmer(farmer.farmer_id);
    } else if (req.user.role === 'veterinarian') {
      history = await VaccinationHistory.getByVet(req.user.user_id);
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(history);
  } catch (error) {
    console.error('Get vaccination history error:', error);
    res.status(500).json({ error: 'Failed to fetch vaccination history' });
  }
});

// Get vaccination history for specific entity
router.get('/history/entity/:entityId', async (req, res) => {
  try {
    // Verify entity exists
    const entity = await Entity.getById(req.params.entityId);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Check if user has access to the farm
    const hasAccess = await checkFarmAccess(req.user, entity.farm_id);
    if (!hasAccess) {
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
      vaccine_end_date: vacc.vaccine_end_date,
      user_id: req.user.user_id
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