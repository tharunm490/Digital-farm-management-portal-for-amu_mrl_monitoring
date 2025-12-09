const db = require('../config/database');
const path = require('path');
const fs = require('fs');
const VaccinationHistory = require('./VaccinationHistory');
const Notification = require('./Notification');
const AMU = require('./AMU');
const { predictTissueMrl, checkOverdosage, calculateSafeDate } = require('../utils/amuTissueService');

class Treatment {
  // Load dosage reference JSON
  static loadDosageReference() {
    try {
      const filePath = path.join(__dirname, '../data/dosage_reference_full_extended_with_mrl.json');
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      console.error('Failed to load dosage reference:', error);
      return null;
    }
  }

  // Calculate MRL and withdrawal using JSON values only
  static calculateMRLAndWithdrawal(species, category, medicine, dose, freq, duration, matrix) {
    const data = this.loadDosageReference();
    if (!data) {
      return {
        predicted_mrl: '50.0',
        predicted_withdrawal_days: category === 'vaccine' || category === 'vitamin' ? 0 : 7,
        status: 'safe',
        overdosage: false,
        safe_date: null
      };
    }

    // Map species names to match JSON keys
    const speciesMap = {
      'cow': 'cattle',
      'goat': 'goat',
      'sheep': 'sheep',
      'pig': 'pig',
      'chicken': 'poultry',
      'poultry': 'poultry'
    };
    const speciesKey = speciesMap[species.toLowerCase()] || species.toLowerCase();

    // Find the medicine in the JSON: data[speciesKey][category][medicine]
    let item = null;
    if (data[speciesKey] && data[speciesKey][category] && data[speciesKey][category][medicine]) {
      item = data[speciesKey][category][medicine];
    }

    if (!item || !item.mrl_by_matrix || !item.mrl_by_matrix[matrix]) {
      // Fallback if not found
      return {
        predicted_mrl: '50.0',
        predicted_withdrawal_days: category === 'vaccine' || category === 'vitamin' ? 0 : 7,
        status: 'safe',
        overdosage: false,
        safe_date: null
      };
    }

    const matrixData = item.mrl_by_matrix[matrix];
    const baseMRL = parseFloat(matrixData.base_mrl) || 0;
    const baseWD = parseFloat(matrixData.base_withdrawal_days) || 0;
    const factor = parseFloat(matrixData.persistence_factor) || 0;
    const thresholds = matrixData.mrl_ug_per_kg;

    // Calculate total dose - ensure all values are numbers
    const safeDose = dose && !isNaN(dose) ? dose : 0;
    const safeFreq = freq && !isNaN(freq) ? freq : 1;
    const safeDuration = duration && !isNaN(duration) ? duration : 1;
    const totalDose = safeDose * safeFreq * safeDuration;

    // Calculate predicted residual limit
    const predictedMRL = baseMRL + (totalDose * factor);

    // Ensure predictedMRL is a valid number
    const safePredictedMRL = isNaN(predictedMRL) ? 50.0 : predictedMRL;

    // Calculate withdrawal days
    const withdrawalDays = Math.ceil(baseWD + (totalDose * factor));

    // Ensure withdrawal days is not negative
    let safeWithdrawalDays = Math.max(0, withdrawalDays);

    // Determine status based on thresholds
    let status = 'safe';
    if (thresholds && safePredictedMRL > thresholds.safe && safePredictedMRL <= thresholds.borderline) {
      status = 'borderline';
    } else if (thresholds && safePredictedMRL > thresholds.borderline) {
      status = 'unsafe';
    }

    // Check for overdosage
    let overdosage = false;
    if (item.recommended_doses && item.recommended_doses.overdose && item.recommended_doses.overdose.min !== null) {
      if (safeDose > item.recommended_doses.overdose.min) {
        overdosage = true;
        status = 'unsafe'; // Force unsafe if overdosage
      }
    }

    // Scale withdrawal days for overdosage
    if (overdosage) {
      const overdoseMultiplier = Math.ceil(safeDose / item.recommended_doses.overdose.min);
      safeWithdrawalDays = Math.max(baseWD * overdoseMultiplier, baseWD * 2);
    }

    // Calculate risk percent
    let riskPercent = null;
    if (baseMRL > 0) {
      riskPercent = (safePredictedMRL / baseMRL) * 100;
    }

    // If category is vaccine or vitamin, set withdrawal to 0
    const finalWithdrawalDays = (category === 'vaccine' || category === 'vitamin') ? 0 : safeWithdrawalDays;

    return {
      predicted_mrl: safePredictedMRL.toFixed(2),
      predicted_withdrawal_days: finalWithdrawalDays,
      status,
      overdosage,
      safe_date: null,
      risk_percent: riskPercent ? riskPercent.toFixed(2) : null
    };
  }
  // Create new treatment record
  static async create(treatmentData) {
    const {
      entity_id,
      user_id,
      medication_type,
      medicine,
      body_weight_kg,
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
      // Vaccine specific fields
      is_vaccine,
      vaccine_interval_days,
      vaccine_total_months,
      next_due_date,
      vaccine_end_date,
      vaccination_date,
      // Prescription fields
      prescription,
      prescription_date,
      prescription_number,
      status // New status field
    } = treatmentData;

    // Map route names to database enum values
    const routeMapping = {
      'Intramuscular (IM)': 'IM',
      'Intravenous (IV)': 'IV',
      'Subcutaneous (SC)': 'SC',
      'Oral': 'oral',
      'Water': 'water',
      'Feed': 'feed'
    };
    const mappedRoute = routeMapping[route] || route;

    const final_is_vaccine = medication_type === 'vaccine';

    // Map medication categories to JSON keys
    const categoryMap = {
      'Anti Inflammatory': 'anti-inflammatory',
      'Antibiotic': 'antibiotic',
      'Anticoccidial': 'anticoccidial',
      'Antiparasitic': 'antiparasitic',
      'Hormonal': 'hormonal',
      'NSAID': 'nsaid'
    };
    const normalizedCategory = categoryMap[medication_type] || medication_type.toLowerCase().replace(/\s+/g, '-');

    // Get entity details to populate additional fields
    const [entityRows] = await db.execute('SELECT * FROM animals_or_batches WHERE entity_id = ?', [entity_id]);
    const entity = entityRows[0];

    if (!entity) {
      throw new Error('Entity not found');
    }

    // Validate species group rules - pigs require vets like cattle/goat/sheep
    const requiresVet = ['cattle', 'goat', 'sheep', 'pig'].includes(entity.species);
    const noVetRequired = ['poultry'].includes(entity.species);

    if (requiresVet) {
      if (!vet_id || !vet_name) {
        throw new Error('Veterinarian details are required for cattle, goat, sheep, and pig treatments');
      }
    }

    // Route validation - only poultry has restrictions
    if (noVetRequired) {
      if (vet_id || vet_name) {
        throw new Error('Veterinarian details should not be provided for poultry treatments');
      }
      if (!['water', 'feed', 'oral'].includes(mappedRoute)) {
        throw new Error('Invalid route for poultry. Must be water, feed, or oral');
      }
    }
    // Pigs, cattle, goat, sheep can use all routes: IM, IV, SC, oral, water, feed

    // Validate numeric fields
    if (dose_amount !== null && dose_amount !== undefined && (isNaN(parseFloat(dose_amount)) || parseFloat(dose_amount) <= 0)) {
      throw new Error('dose_amount must be a positive number');
    }
    if (body_weight_kg !== null && body_weight_kg !== undefined && body_weight_kg !== '' && (isNaN(parseFloat(body_weight_kg)) || parseFloat(body_weight_kg) <= 0)) {
      throw new Error('body_weight_kg must be a positive number when provided');
    }
    if (frequency_per_day !== null && frequency_per_day !== undefined && (isNaN(parseInt(frequency_per_day)) || parseInt(frequency_per_day) <= 0)) {
      throw new Error('frequency_per_day must be a positive integer');
    }
    if (duration_days !== null && duration_days !== undefined && (isNaN(parseInt(duration_days)) || parseInt(duration_days) <= 0)) {
      throw new Error('duration_days must be a positive integer');
    }
    if (vaccine_interval_days !== null && vaccine_interval_days !== undefined && (isNaN(parseInt(vaccine_interval_days)) || parseInt(vaccine_interval_days) <= 0)) {
      throw new Error('vaccine_interval_days must be a positive integer');
    }
    if (vaccine_total_months !== null && vaccine_total_months !== undefined && (isNaN(parseInt(vaccine_total_months)) || parseInt(vaccine_total_months) <= 0)) {
      throw new Error('vaccine_total_months must be a positive integer');
    }

    // Validate dates
    if (start_date && end_date && start_date > end_date) {
      throw new Error('start_date cannot be after end_date');
    }

    // Format dates from DD-MM-YYYY to YYYY-MM-DD
    let formattedStartDate = start_date;
    if (start_date && typeof start_date === 'string' && start_date.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [dd, mm, yyyy] = start_date.split('-');
      formattedStartDate = `${yyyy}-${mm}-${dd}`;
    }
    let formattedEndDate = end_date;
    if (end_date && typeof end_date === 'string' && end_date.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [dd, mm, yyyy] = end_date.split('-');
      formattedEndDate = `${yyyy}-${mm}-${dd}`;
    }

    // Calculate end_date if not provided
    if (!formattedEndDate) {
      if (duration_days && duration_days > 0) {
        const start = new Date(formattedStartDate);
        start.setDate(start.getDate() + duration_days - 1);
        formattedEndDate = start.toISOString().split('T')[0];
      } else {
        formattedEndDate = formattedStartDate;
      }
    }

    // Calculate vaccine dates
    let final_next_due_date = next_due_date;
    let final_vaccine_end_date = vaccine_end_date;

    if (final_is_vaccine && vaccination_date) {
      const vaccDate = new Date(vaccination_date);

      if (!final_next_due_date) {
        final_next_due_date = new Date(vaccDate.getTime() + ((vaccine_interval_days || 30) * 24 * 60 * 60 * 1000));
        final_next_due_date = final_next_due_date.toISOString().split('T')[0];
      }

      if (!final_vaccine_end_date) {
        final_vaccine_end_date = new Date(vaccDate.getTime() + (vaccine_total_months * 30.44 * 24 * 60 * 60 * 1000));
        final_vaccine_end_date = final_vaccine_end_date.toISOString().split('T')[0];
      }
    }

    const query = `
      INSERT INTO treatment_records
      (entity_id, farm_id, user_id, species, medication_type, is_vaccine, vaccine_interval_days, vaccine_total_months, next_due_date, vaccine_end_date, vet_id, vet_name, reason, cause, medicine, start_date, end_date, route, dose_amount, dose_unit, body_weight_kg, frequency_per_day, duration_days, prescription, prescription_date, prescription_number, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Determine status based on who is creating the treatment
    let treatmentStatus = status || 'approved'; // Use provided status or default to approved
    if (requiresVet && !vet_id && !status) {
      // Farmer creating treatment for species that requires vet - should be pending
      treatmentStatus = 'pending';
    }

    const [result] = await db.execute(query, [
      entity_id,
      entity.farm_id,
      user_id,
      entity.species,
      medication_type,
      final_is_vaccine,
      final_is_vaccine ? (vaccine_interval_days && !isNaN(parseInt(vaccine_interval_days)) ? parseInt(vaccine_interval_days) : null) : null,
      final_is_vaccine ? (vaccine_total_months && !isNaN(parseInt(vaccine_total_months)) ? parseInt(vaccine_total_months) : null) : null,
      final_is_vaccine ? final_next_due_date : null,
      final_is_vaccine ? final_vaccine_end_date : null,
      vet_id || null,
      vet_name || null,
      reason || null,
      cause || null,
      medicine,
      formattedStartDate,
      formattedEndDate,
      mappedRoute,
      dose_amount ? (isNaN(parseFloat(dose_amount)) ? null : parseFloat(dose_amount)) : null,
      dose_unit,
      body_weight_kg ? (isNaN(parseFloat(body_weight_kg)) ? null : parseFloat(body_weight_kg)) : null,
      frequency_per_day ? (isNaN(parseInt(frequency_per_day)) ? null : parseInt(frequency_per_day)) : null,
      duration_days ? (isNaN(parseInt(duration_days)) ? null : parseInt(duration_days)) : null,
      prescription || null,
      prescription_date || null,
      prescription_number || null,
      treatmentStatus
    ]);

    const treatmentId = result.insertId;

    // Create vaccination history record if it's a vaccine
    if (final_is_vaccine) {
      await VaccinationHistory.create({
        entity_id,
        treatment_id: treatmentId,
        vaccine_name: medicine,
        given_date: vaccination_date,
        interval_days: vaccine_interval_days,
        next_due_date: final_next_due_date,
        vaccine_total_months,
        vaccine_end_date: final_vaccine_end_date,
        user_id
      });
    }

    // Auto-create AMU record with formula-based predictions (only for non-vaccine treatments)
    if (!final_is_vaccine) {
      const predictions = this.calculateMRLAndWithdrawal(
        entity.species,
        normalizedCategory,
        medicine,
        dose_amount ? parseFloat(dose_amount) : null,
        duration_days ? parseInt(duration_days) : null,
        frequency_per_day ? parseInt(frequency_per_day) : null,
        entity.matrix
      );

      // Load dosage reference for additional validation
      let dosageRef = null;
      try {
        dosageRef = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/dosage_reference_full_extended_with_mrl.json'), 'utf8'));
      } catch (e) {
        console.warn('Failed to load dosage reference JSON:', e.message);
      }

      let finalPredictions = predictions;

      let subtype = null;
      if (finalPredictions.status === 'unsafe') {
        subtype = 'unsafe_mrl';
      }

      // Check dose against recommended values
      let recommended = null;
      if (dosageRef && dosageRef[entity.species] && dosageRef[entity.species][medicine]) {
        const medData = dosageRef[entity.species][medicine];
        if (medData.dose && medData.dose.max) {
          recommended = medData.dose.max;
        }
      }

      if (recommended && dose_amount > recommended) {
        finalPredictions.status = 'unsafe';
        subtype = 'high_dosage';
      }

      const amuId = await this.createAMURecord(treatmentId, finalPredictions, formattedEndDate);

      // Auto-assign a laboratory and create a sample request if applicable
      try {
        await this.autoAssignLabAndCreateSample(amuId, treatmentId);
      } catch (e) {
        console.warn('Failed to auto-assign lab/sample:', e && e.message ? e.message : e);
      }

      // Create tissue predictions if matrix is meat
      if (entity.matrix === 'meat') {
        const tissueResults = predictTissueMrl(
          entity.species,
          normalizedCategory,
          medicine,
          dose_amount ? parseFloat(dose_amount) : null,
          dose_unit,
          duration_days ? parseInt(duration_days) : null,
          entity.matrix,
          formattedEndDate,
          formattedEndDate, // current date as end_date for initial prediction
          frequency_per_day ? parseInt(frequency_per_day) : null
        );

        if (tissueResults) {
          const TissueResult = require('./TissueResult');
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

          // Update AMU with worst tissue info
          const worstTissueRiskPercent = tissueResults.tissues[tissueResults.worst_tissue].risk_percent;
          // Clamp risk_percent to prevent database range errors
          const clampedWorstTissueRiskPercent = Math.max(0, Math.min(999.99, parseFloat(worstTissueRiskPercent)));
          
          await AMU.update(amuId, {
            worst_tissue: tissueResults.worst_tissue,
            risk_category: tissueResults.overall_risk_category,
            predicted_mrl: tissueResults.predicted_mrl,
            predicted_withdrawal_days: tissueResults.predicted_withdrawal_days,
            safe_date: tissueResults.safe_date,
            overdosage: tissueResults.overdosage,
            risk_percent: clampedWorstTissueRiskPercent
          });
        }
      }

      // Create notification if unsafe or overdosage
      if (finalPredictions.status === 'unsafe' || finalPredictions.overdosage) {
        let notificationSubtype = subtype;
        let notificationMessage = '';

        if (finalPredictions.overdosage) {
          notificationSubtype = 'overdosage';
          notificationMessage = `Overdosage alert: ${dose_amount} ${dose_unit} exceeds safe limits for ${medicine} in ${entity.species}.`;
        } else if (subtype === 'high_dosage') {
          notificationMessage = `High dosage alert: ${dose_amount} ${dose_unit} exceeds recommended ${recommended} ${dose_unit} for ${medicine} in ${entity.species}.`;
        } else {
          notificationMessage = `Unsafe residual limit alert: Predicted Residual Limit ${finalPredictions.predicted_mrl} for ${medicine} in ${entity.species} (${entity.matrix}).`;
        }

        // Notify farmer
        await Notification.create({
          user_id,
          type: 'alert',
          subtype: notificationSubtype,
          message: notificationMessage,
          entity_id,
          treatment_id: treatmentId,
          amu_id: amuId
        });

        // Notify veterinarian
        const VetFarmMapping = require('./VetFarmMapping');
        const vetMapping = await VetFarmMapping.getVetForFarm(entity.farm_id);
        if (vetMapping) {
          await Notification.create({
            user_id: vetMapping.user_id,
            type: 'alert',
            subtype: notificationSubtype,
            message: `Alert for farm ${entity.farm_name}: ${notificationMessage}`,
            entity_id,
            treatment_id: treatmentId,
            amu_id: amuId
          });
        }
      }
    }

    return treatmentId;
  }

  // Auto-create AMU record
  static async createAMURecord(treatmentId, predictions, end_date) {
    const { predicted_mrl, predicted_withdrawal_days, status, overdosage, risk_percent } = predictions;

    // Calculate safe_date: end_date + predicted_withdrawal_days
    let safe_date = null;
    if (end_date && predicted_withdrawal_days > 0) {
      const endDate = new Date(end_date);
      endDate.setDate(endDate.getDate() + predicted_withdrawal_days);
      safe_date = endDate.toISOString().split('T')[0];
    }

    // Clamp risk_percent to prevent database range errors
    let clampedRiskPercent = risk_percent;
    if (clampedRiskPercent !== null && clampedRiskPercent !== undefined) {
      // Assuming the column can hold values up to 999.99, clamp to reasonable range
      clampedRiskPercent = Math.max(0, Math.min(999.99, parseFloat(clampedRiskPercent)));
    }

    const insertQuery = `
      INSERT INTO amu_records (
        treatment_id, entity_id, farm_id, user_id,
        species, medication_type, matrix,
        medicine, active_ingredient, category_type,
        reason, cause,
        route, dose_amount, dose_unit,
        frequency_per_day, duration_days,
        start_date, end_date,
        predicted_mrl, predicted_withdrawal_days, overdosage, risk_category,
        safe_date, risk_percent
      )
      SELECT
        tr.treatment_id,
        tr.entity_id,
        tr.farm_id,
        tr.user_id,
        tr.species,
        tr.medication_type,
        ao.matrix,
        tr.medicine,
        tr.medicine,
        tr.medication_type,
        tr.reason,
        tr.cause,
        tr.route,
        tr.dose_amount,
        tr.dose_unit,
        tr.frequency_per_day,
        tr.duration_days,
        tr.start_date,
        tr.end_date,
        ?, ?, ?, ?,
        ?, ?
      FROM treatment_records tr
      JOIN animals_or_batches ao ON tr.entity_id = ao.entity_id
      WHERE tr.treatment_id = ?
    `;

    const [result] = await db.execute(insertQuery, [
      predicted_mrl || null,
      predicted_withdrawal_days || null,
      overdosage ? 1 : 0,
      status || 'safe',
      safe_date,
      clampedRiskPercent || null,
      treatmentId
    ]);

    return result.insertId;
  }

  // After AMU record is created, optionally auto-create a sample_request and assign to nearest lab
  static async autoAssignLabAndCreateSample(amuId, treatmentId) {
    try {
      const Laboratory = require('./Laboratory');
      const SampleRequest = require('./SampleRequest');
      const Notification = require('./Notification');

      // Load treatment and entity/farm details
      const [tRows] = await db.execute('SELECT t.*, a.matrix, a.farm_id FROM treatment_records t JOIN animals_or_batches a ON t.entity_id = a.entity_id WHERE t.treatment_id = ?', [treatmentId]);
      if (!tRows || tRows.length === 0) return null;
      const t = tRows[0];

      // Fetch farm location
      const [farmRows] = await db.execute('SELECT * FROM farms WHERE farm_id = ?', [t.farm_id]);
      const farm = farmRows && farmRows[0] ? farmRows[0] : null;

      const loc = { taluk: farm ? farm.taluk : null, district: farm ? farm.district : null, state: farm ? farm.state : null };

      // Find nearest lab
      const lab = await Laboratory.findNearestByLocation(loc);
      if (!lab) return null;

      // Create sample_request with safe_date from AMU record's safe_date if present
      const [amuRows] = await db.execute('SELECT * FROM amu_records WHERE amu_id = ?', [amuId]);
      const amu = amuRows && amuRows[0] ? amuRows[0] : null;
      const safe_date = amu && amu.safe_date ? amu.safe_date : t.end_date;

      const sampleRequestId = await SampleRequest.create({
        treatment_id: treatmentId,
        farmer_id: t.user_id,
        entity_id: t.entity_id,
        assigned_lab_id: lab.lab_id,
        safe_date,
        status: 'requested'
      });

      // Notify lab via Notification model
      await Notification.create({
        user_id: lab.user_id,
        type: 'task',
        subtype: 'sample_collection',
        message: `Withdrawal completed. Sample collection required for Entity ${t.entity_id}.`,
        entity_id: t.entity_id,
        treatment_id: treatmentId
      });

      return sampleRequestId;
    } catch (e) {
      console.warn('autoAssignLabAndCreateSample error:', e && e.message ? e.message : e);
      return null;
    }
  }



  // Get treatment by ID
  static async getById(treatmentId) {
    const query = `
      SELECT t.*, e.entity_type, e.tag_id, e.batch_name, e.species
      FROM treatment_records t
      JOIN animals_or_batches e ON t.entity_id = e.entity_id
      WHERE t.treatment_id = ?
    `;
    const [rows] = await db.execute(query, [treatmentId]);
    return rows[0];
  }

  // Get all treatments for an entity
  static async getByEntity(entityId) {
    const query = `
      SELECT t.*, a.safe_date as withdrawal_end_date, e.entity_type, e.tag_id, e.batch_name, e.species
      FROM treatment_records t
      LEFT JOIN amu_records a ON t.treatment_id = a.treatment_id
      LEFT JOIN animals_or_batches e ON t.entity_id = e.entity_id
      WHERE t.entity_id = ?
      ORDER BY t.start_date DESC
    `;
    const [rows] = await db.execute(query, [entityId]);
    return rows;
  }  // Get treatments with AMU records
  static async getWithAMU(treatmentId) {
    const treatmentQuery = `
      SELECT t.*, e.entity_type, e.tag_id, e.batch_name, e.species
      FROM treatment_records t
      JOIN animals_or_batches e ON t.entity_id = e.entity_id
      WHERE t.treatment_id = ?
    `;
    const [treatmentRows] = await db.execute(treatmentQuery, [treatmentId]);
    
    if (treatmentRows.length === 0) {
      return null;
    }

    const amuQuery = 'SELECT * FROM amu_records WHERE treatment_id = ?';
    const [amuRows] = await db.execute(amuQuery, [treatmentId]);

    return {
      ...treatmentRows[0],
      amu_records: amuRows
    };
  }

  // Get all treatments by vet (through mapped farms)
  static async getByVet(vetId) {
    const query = `
      SELECT t.*, e.entity_type, e.tag_id, e.batch_name, e.species, f.farm_name
      FROM treatment_records t
      JOIN animals_or_batches e ON t.entity_id = e.entity_id
      JOIN farms f ON t.farm_id = f.farm_id
      JOIN vet_farm_mapping vfm ON f.farm_id = vfm.farm_id
      WHERE vfm.vet_id = ? AND t.status = 'approved'
      ORDER BY t.start_date DESC
    `;
    const [rows] = await db.execute(query, [vetId]);
    return rows;
  }

  // Get all treatments by farmer (all treatments on their farms)
  static async getByFarmer(farmerId) {
    const query = `
      SELECT t.*, e.entity_type, e.tag_id, e.batch_name, e.species, f.farm_name
      FROM treatment_records t
      JOIN animals_or_batches e ON t.entity_id = e.entity_id
      JOIN farms f ON t.farm_id = f.farm_id
      WHERE f.farmer_id = ?
      ORDER BY t.start_date DESC
    `;
    const [rows] = await db.execute(query, [farmerId]);
    return rows;
  }

  // ...existing code...

  // Get recent treatments by vet (last N days)
  static async getRecentByVet(vet_id, days = 30) {
    const query = `
      SELECT t.*, e.entity_type, e.tag_id, e.batch_name, e.species, f.farm_name
      FROM treatment_records t
      JOIN animals_or_batches e ON t.entity_id = e.entity_id
      JOIN farms f ON t.farm_id = f.farm_id
      JOIN vet_farm_mapping vfm ON f.farm_id = vfm.farm_id
      WHERE vfm.vet_id = ? 
        AND t.start_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND t.status = 'approved'
      ORDER BY t.start_date DESC
    `;
    const [rows] = await db.execute(query, [vet_id, days]);
    return rows;
  }
}

module.exports = Treatment;
