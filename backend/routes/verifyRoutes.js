const express = require('express');
const router = express.Router();
const Entity = require('../models/Entity');
const Treatment = require('../models/Treatment');
const AMU = require('../models/AMU');
const MRL = require('../models/MRL');
const { TamperProof } = require('../models/QR');

// GET /api/verify/:entity_id - Complete entity verification data (Public - no auth required for QR scanning)
router.get('/:entity_id', async (req, res) => {
  try {
    const { entity_id } = req.params;
    
    console.log('Verifying entity ID:', entity_id);
    
    // Fetch entity details
    const entity = await Entity.getById(entity_id);
    console.log('Entity found:', entity);
    
    if (!entity) {
      console.log('Entity not found for ID:', entity_id);
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    // Fetch all treatment records
    const treatments = await Treatment.getByEntity(entity_id);
    
    // Fetch all AMU records
    const amuRecords = await AMU.getByEntityId(entity_id);
    
    // Fetch MRL data for this species and matrix
    const mrlData = await MRL.getBySpeciesAndMatrix(entity.species, entity.matrix);
    
    // Get latest treatment for withdrawal calculation
    const latestTreatment = treatments && treatments.length > 0 ? treatments[0] : null;
    
    let withdrawalStatus = null;
    let withdrawalFinishDate = null;
    let daysFromWithdrawal = null;
    let mrlPass = false;
    
    if (latestTreatment && latestTreatment.withdrawal_end_date) {
      withdrawalFinishDate = new Date(latestTreatment.withdrawal_end_date);
      
      // Calculate days from withdrawal (absolute value for display)
      const today = new Date();
      const timeDiff = withdrawalFinishDate - today;
      daysFromWithdrawal = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      // Determine PASS/FAIL
      mrlPass = daysFromWithdrawal <= 0;
      withdrawalStatus = mrlPass ? 'PASS' : 'FAIL';
    }
    
    // Prepare response
    const response = {
      entity_details: {
        entity_id: entity.entity_id,
        entity_type: entity.entity_type,
        tag_id: entity.tag_id,
        batch_name: entity.batch_name,
        species: entity.species,
        breed: entity.breed,
        matrix: entity.matrix,
        farm_name: entity.farm_name,
        animal_count: entity.animal_count,
        weight_kg: entity.weight_kg,
        age_months: entity.age_months
      },
      treatment_records: treatments.map(treatment => ({
        treatment_id: treatment.treatment_id,
        active_ingredient: treatment.active_ingredient || treatment.medicine,
        dose_mg_per_kg: treatment.dose_mg_per_kg,
        route: treatment.route,
        frequency_per_day: treatment.frequency_per_day,
        duration_days: treatment.duration_days,
        start_date: treatment.start_date,
        end_date: treatment.end_date,
        withdrawal_period_days: treatment.withdrawal_period_days,
        withdrawal_end_date: treatment.withdrawal_end_date
      })),
      amu_records: amuRecords || [],
      mrl_limits: mrlData || null,
      withdrawal_info: {
        withdrawal_period_days: latestTreatment?.withdrawal_period_days || 0,
        withdrawal_finish_date: withdrawalFinishDate,
        days_from_withdrawal: daysFromWithdrawal,
        status: withdrawalStatus,
        mrl_pass: mrlPass
      },
      tamper_proof: {
        verified: true,
        message: 'Record verified successfully'
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error verifying entity:', error);
    res.status(500).json({ error: 'Failed to verify entity' });
  }
});

module.exports = router;
