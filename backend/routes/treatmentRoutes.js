const express = require('express');
const router = express.Router();
const Treatment = require('../models/Treatment');
const AMU = require('../models/AMU');
const Entity = require('../models/Entity');
const MRL = require('../models/MRL');
const db = require('../config/database');
const { authMiddleware, farmerOnly, veterinarianOnly } = require('../middleware/auth');

// Role-based middleware for farmers and vets
const farmerOrVet = (req, res, next) => {
  if (req.user.role !== 'farmer' && req.user.role !== 'veterinarian') {
    return res.status(403).json({ error: 'Access denied. Farmers and veterinarians only.' });
  }
  next();
};
const { predictTissueMrl, checkOverdosage, calculateSafeDate } = require('../utils/amuTissueService');

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

// Get all treatments for logged-in user (filtered by role)
router.get('/', farmerOrVet, async (req, res) => {
  try {
    if (req.user.role === 'farmer') {
      const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
      if (!farmer) {
        return res.status(404).json({ error: 'Farmer profile not found' });
      }
      
      const treatments = await Treatment.getByFarmer(farmer.farmer_id);
      res.json(treatments);
    } else if (req.user.role === 'veterinarian') {
      const veterinarian = await require('../models/User').Veterinarian.getByUserId(req.user.user_id);
      if (!veterinarian) {
        return res.status(404).json({ error: 'Veterinarian profile not found' });
      }
      
      const treatments = await Treatment.getByVet(veterinarian.vet_id);
      res.json(treatments);
    }
  } catch (error) {
    console.error('Get treatments error:', error);
    res.status(500).json({ error: 'Failed to fetch treatments' });
  }
});

// Get recent treatments (last 30 days by default)
router.get('/recent', farmerOrVet, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    if (req.user.role === 'farmer') {
      const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
      if (!farmer) {
        return res.status(404).json({ error: 'Farmer profile not found' });
      }
      
      const treatments = await Treatment.getRecent(farmer.farmer_id, days);
      res.json(treatments);
    } else if (req.user.role === 'veterinarian') {
      // For vets, get recent treatments from their mapped farms
      const veterinarian = await require('../models/User').Veterinarian.getByUserId(req.user.user_id);
      if (!veterinarian) {
        return res.status(404).json({ error: 'Veterinarian profile not found' });
      }
      
      const treatments = await Treatment.getRecentByVet(veterinarian.vet_id, days);
      res.json(treatments);
    }
  } catch (error) {
    console.error('Get recent treatments error:', error);
    res.status(500).json({ error: 'Failed to fetch recent treatments' });
  }
});

// Get treatments for specific entity
router.get('/entity/:entityId', farmerOrVet, async (req, res) => {
  try {
    // Verify entity ownership
    const entity = await Entity.getById(req.params.entityId);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    const farm = await require('../models/Farm').getById(entity.farm_id);
    let hasAccess = false;
    
    if (req.user.role === 'farmer') {
      const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
      hasAccess = farmer && farm.farmer_id === farmer.farmer_id;
    } else if (req.user.role === 'veterinarian') {
      const VetFarmMapping = require('../models/VetFarmMapping');
      const vetMapping = await VetFarmMapping.getVetsByFarm(farm.farm_id);
      const vet = await require('../models/User').Veterinarian.getByUserId(req.user.user_id);
      hasAccess = vet && vetMapping.some(mapping => mapping.vet_id === vet.vet_id);
    }
    
    if (!hasAccess) {
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
router.get('/:treatmentId', farmerOrVet, async (req, res) => {
  try {
    const treatment = await Treatment.getWithAMU(req.params.treatmentId);
    
    if (!treatment) {
      return res.status(404).json({ error: 'Treatment not found' });
    }

    // Verify ownership through entity
    const entity = await Entity.getById(treatment.entity_id);
    const farm = await require('../models/Farm').getById(entity.farm_id);
    let hasAccess = false;
    
    if (req.user.role === 'farmer') {
      const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
      hasAccess = farmer && farm.farmer_id === farmer.farmer_id;
    } else if (req.user.role === 'veterinarian') {
      const VetFarmMapping = require('../models/VetFarmMapping');
      const vetMapping = await VetFarmMapping.getVetsByFarm(farm.farm_id);
      const vet = await require('../models/User').Veterinarian.getByUserId(req.user.user_id);
      hasAccess = vet && vetMapping.some(mapping => mapping.vet_id === vet.vet_id);
    }
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(treatment);
  } catch (error) {
    console.error('Get treatment error:', error);
    res.status(500).json({ error: 'Failed to fetch treatment' });
  }
});

// Create new treatment with optional AMU records
router.post('/', farmerOrVet, async (req, res) => {
  try {
    const { 
      entity_id, 
      medication_type, 
      medicine, 
      dose_amount, 
      dose_unit, 
      route, 
      frequency_per_day, 
      duration_days, 
      start_date, 
      end_date, 
      vet_id, 
      vet_name, 
      reason,
      cause,
      vaccination_date,
      vaccine_interval_days,
      vaccine_total_months,
      next_due_date,
      vaccine_end_date,
      request_id // For vets approving requests
    } = req.body;

    // Validate required fields
    if (!entity_id) {
      return res.status(400).json({ error: 'entity_id is required' });
    }
    if (!medicine) {
      return res.status(400).json({ error: 'medicine is required' });
    }
    if (!start_date) {
      return res.status(400).json({ error: 'start_date is required' });
    }

    // Verify entity exists
    const entity = await Entity.getById(entity_id);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    const farm = await require('../models/Farm').getById(entity.farm_id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    // Check access based on role
    let hasAccess = false;
    let isVetCreating = false;
    
    if (req.user.role === 'farmer') {
      // Farmers can access their own farms
      const farmer = await require('../models/User').Farmer.getByUserId(req.user.user_id);
      hasAccess = farmer && farm.farmer_id === farmer.farmer_id;
      
      // Farmers can only add treatments for poultry directly
      if (entity.species !== 'poultry') {
        return res.status(403).json({ error: 'Farmers can only add treatments for poultry directly. For other species, please submit a treatment request.' });
      }
    } else if (req.user.role === 'veterinarian') {
      // Vets can access mapped farms
      const VetFarmMapping = require('../models/VetFarmMapping');
      const vetMapping = await VetFarmMapping.getVetsByFarm(farm.farm_id);
      const vet = await require('../models/User').Veterinarian.getByUserId(req.user.user_id);
      hasAccess = vet && vetMapping.some(mapping => mapping.vet_id === vet.vet_id);
      isVetCreating = true;
      
      // For vets, require a treatment request
      if (!request_id) {
        return res.status(403).json({ error: 'Veterinarians can only create treatments from approved treatment requests.' });
      }
      
      // For vets, check if there's an approved treatment request
      if (request_id) {
        const TreatmentRequest = require('../models/TreatmentRequest');
        const request = await TreatmentRequest.getById(request_id);
        if (!request || request.status !== 'approved' || request.vet_id !== vet.vet_id) {
          return res.status(403).json({ error: 'Invalid or unapproved treatment request' });
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check minimum gap rule - no new treatment during active treatment duration
    const newStartDate = intToDate(start_date);
    const [existingTreatments] = await db.execute(`
      SELECT t.end_date 
      FROM treatment_records t
      WHERE t.entity_id = ? 
        AND t.end_date IS NOT NULL 
        AND t.end_date >= ?
      ORDER BY t.end_date DESC 
      LIMIT 1
    `, [entity_id, newStartDate]);

    if (existingTreatments.length > 0) {
      return res.status(400).json({ 
        error: `This animal/batch is currently undergoing treatment until ${existingTreatments[0].end_date}. Cannot start new treatment during active treatment period.` 
      });
    }

    // For vets, ensure vet_id and vet_name are provided
    let finalVetId = vet_id;
    let finalVetName = vet_name;
    
    if (isVetCreating) {
      const vet = await require('../models/User').Veterinarian.getByUserId(req.user.user_id);
      finalVetId = vet.vet_id;
      finalVetName = vet.vet_name;
    }

    // Create treatment
    const treatmentId = await Treatment.create({
      entity_id,
      user_id: req.user.user_id,
      medication_type,
      medicine,
      dose_amount,
      dose_unit,
      route,
      frequency_per_day,
      duration_days,
      start_date: intToDate(start_date),
      end_date: intToDate(end_date),
      vet_id: finalVetId,
      vet_name: finalVetName,
      reason,
      cause,
      vaccination_date: intToDate(vaccination_date),
      vaccine_interval_days,
      vaccine_total_months,
      next_due_date: intToDate(next_due_date),
      vaccine_end_date: intToDate(vaccine_end_date),
      status: isVetCreating ? 'approved' : 'pending' // Vets create approved treatments, farmers create pending
    });

    // If this was from a treatment request, update the request status
    if (request_id) {
      const TreatmentRequest = require('../models/TreatmentRequest');
      await TreatmentRequest.updateStatus(request_id, 'completed');
      
      // Notify farmer
      const Notification = require('../models/Notification');
      const farmerUser = await db.query('SELECT user_id FROM farmers WHERE farmer_id = ?', [farm.farmer_id]);
      if (farmerUser[0] && farmerUser[0][0]) {
        await Notification.create({
          user_id: farmerUser[0][0].user_id,
          type: 'alert',
          message: `Treatment has been administered to ${entity.species} ${entity.tag_id || entity.batch_name}`
        });
      }
    }

    const treatment = await Treatment.getById(treatmentId);

    res.status(201).json({
      message: 'Treatment created successfully',
      treatment
    });
  } catch (error) {
    console.error('Create treatment error:', error);
    res.status(500).json({ error: error.message || 'Failed to create treatment' });
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

    // Tissue-wise MRL prediction for MEAT matrix
    let tissueResults = null;
    if (entity.matrix === 'meat' && newAMU.medicine) {
      tissueResults = predictTissueMrl(
        entity.species,
        newAMU.category_type, // Use category_type instead of medicine
        newAMU.medicine,
        newAMU.dose_amount,
        newAMU.dose_unit,
        newAMU.duration_days,
        entity.matrix,
        newAMU.end_date, // End date of treatment
        new Date().toISOString().split('T')[0], // Current date
        newAMU.frequency_per_day
      );

      if (tissueResults) {
        // Insert tissue results into database
        const TissueResult = require('../models/TissueResult'); // Assuming model exists
        for (const [tissue, data] of Object.entries(tissueResults.tissues)) {
          await TissueResult.create({
            amu_id: amuId,
            tissue,
            predicted_mrl: data.predicted_mrl,
            base_mrl: data.base_mrl,
            risk_percent: data.risk_percent,
            risk_category: data.risk_category
          });
        }

        // Update AMU record with worst tissue info
        const safeDate = calculateSafeDate(newAMU.start_date, tissueResults.predicted_withdrawal_days);
        await AMU.update(amuId, {
          worst_tissue: tissueResults.worst_tissue,
          risk_category: tissueResults.overall_risk_category,
          predicted_mrl: tissueResults.predicted_mrl,
          predicted_withdrawal_days: tissueResults.predicted_withdrawal_days,
          safe_date: safeDate,
          overdosage: tissueResults.overdosage,
          message: tissueResults.message,
          risk_percent: tissueResults.tissues[tissueResults.worst_tissue].risk_percent
        });

        // 🔬 STEP 1: AUTO-CREATE SAMPLE REQUEST when AMU record is generated
        console.log(`📌 Creating sample request for treatment ${req.params.treatmentId} with safe_date: ${safeDate}`);
        
        try {
          // Find lab by location (taluk → district → state → any)
          const Laboratory = require('../models/Laboratory');
          const assignedLab = await Laboratory.findNearestByLocation({
            taluk: farm.taluk,
            district: farm.district,
            state: farm.state
          });

          if (assignedLab) {
            const SampleRequest = require('../models/SampleRequest');
            const sampleRequestId = await SampleRequest.create({
              treatment_id: req.params.treatmentId,
              farmer_id: farmer.farmer_id,
              entity_id: entity.entity_id,
              assigned_lab_id: assignedLab.lab_id,
              safe_date: safeDate,
              status: 'requested'
            });

            console.log(`✅ Sample request created: ID ${sampleRequestId} for Lab ID ${assignedLab.lab_id}`);

            // Create notification for lab about new sample request
            const Notification = require('../models/Notification');
            await Notification.create({
              user_id: assignedLab.user_id,
              type: 'alert',
              subtype: 'sample_request_assigned',
              message: `New sample request assigned. Safe date: ${safeDate}`,
              entity_id: entity.entity_id,
              treatment_id: req.params.treatmentId
            });
          } else {
            console.warn('⚠️ No lab found for location-based assignment');
          }
        } catch (err) {
          console.error('Error creating sample request:', err.message);
          // Don't fail the AMU creation if sample request fails
        }
      }
    }

    res.status(201).json({
      message: 'AMU record added successfully',
      amu_record: newAMU,
      tissue_results: tissueResults,
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

// Get vaccination history for a treatment
router.get('/:treatmentId/vaccination-history', async (req, res) => {
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

    const VaccinationHistory = require('../models/VaccinationHistory');
    const history = await VaccinationHistory.getByTreatment(req.params.treatmentId);
    res.json(history);
  } catch (error) {
    console.error('Get vaccination history error:', error);
    res.status(500).json({ error: 'Failed to fetch vaccination history' });
  }
});

// Mark vaccination as given (create new vaccination history entry)
router.post('/:treatmentId/vaccination-history', async (req, res) => {
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

    if (treatment.medication_type !== 'vaccine') {
      return res.status(400).json({ error: 'Treatment is not a vaccine' });
    }

    const VaccinationHistory = require('../models/VaccinationHistory');
    
    // Get the latest vaccination history for this treatment
    const history = await VaccinationHistory.getByTreatment(req.params.treatmentId);
    const latestEntry = history[0]; // Most recent first

    if (!latestEntry) {
      return res.status(404).json({ error: 'No vaccination history found for this treatment' });
    }

    // Check if vaccination is due
    const today = new Date().toISOString().split('T')[0];
    if (today < latestEntry.next_due_date) {
      return res.status(400).json({ error: 'Vaccination is not due yet' });
    }

    // Check if vaccination cycle is completed
    if (today >= latestEntry.vaccine_end_date) {
      return res.status(400).json({ error: 'Vaccination cycle is already completed' });
    }

    // Calculate next due date
    const givenDate = new Date(today);
    const nextDueDate = new Date(givenDate.getTime() + (latestEntry.interval_days * 24 * 60 * 60 * 1000));

    // Create new vaccination history entry
    const vaccId = await VaccinationHistory.create({
      entity_id: treatment.entity_id,
      treatment_id: req.params.treatmentId,
      vaccine_name: latestEntry.vaccine_name,
      given_date: today,
      interval_days: latestEntry.interval_days,
      next_due_date: nextDueDate.toISOString().split('T')[0],
      vaccine_total_months: latestEntry.vaccine_total_months,
      vaccine_end_date: latestEntry.vaccine_end_date
    });

    const newEntry = await VaccinationHistory.getById(vaccId);
    res.status(201).json({
      message: 'Vaccination marked as given',
      vaccination: newEntry
    });
  } catch (error) {
    console.error('Mark vaccination error:', error);
    res.status(500).json({ error: 'Failed to mark vaccination as given' });
  }
});

module.exports = router;
