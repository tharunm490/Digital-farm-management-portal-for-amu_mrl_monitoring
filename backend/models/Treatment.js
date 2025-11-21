const db = require('../config/database');
const { spawn } = require('child_process');
const path = require('path');
const VaccinationHistory = require('./VaccinationHistory');

class Treatment {
  // Create new treatment record
  static async create(treatmentData) {
    const {
      entity_id,
      user_id,
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
      // Vaccine specific fields
      is_vaccine,
      vaccine_interval_days,
      vaccine_total_months,
      next_due_date,
      vaccine_end_date,
      vaccination_date
    } = treatmentData;

    // Get entity details to populate additional fields
    const [entityRows] = await db.execute('SELECT * FROM animals_or_batches WHERE entity_id = ?', [entity_id]);
    const entity = entityRows[0];

    if (!entity) {
      throw new Error('Entity not found');
    }

    // Validate species group rules
    const isLargeAnimal = ['cattle', 'goat', 'sheep'].includes(entity.species);
    const isSmallAnimal = ['pig', 'poultry'].includes(entity.species);

    if (isLargeAnimal) {
      if (!vet_id || !vet_name) {
        throw new Error('Veterinarian details are required for cattle, goat, and sheep treatments');
      }
      if (!['IM', 'IV', 'SC', 'oral'].includes(route)) {
        throw new Error('Invalid route for large animals. Must be IM, IV, SC, or oral');
      }
    } else if (isSmallAnimal) {
      if (vet_id || vet_name) {
        throw new Error('Veterinarian details should not be provided for pig and poultry treatments');
      }
      if (!['water', 'feed', 'oral'].includes(route)) {
        throw new Error('Invalid route for small animals. Must be water, feed, or oral');
      }
    }

    // Handle vaccine validation
    const final_is_vaccine = medication_type === 'vaccine';
    if (final_is_vaccine) {
      if (!vaccine_interval_days || !vaccine_total_months || !vaccination_date) {
        throw new Error('Vaccine interval days, total months, and vaccination date are required for vaccines');
      }
    }

    // Calculate vaccine dates
    let final_next_due_date = next_due_date;
    let final_vaccine_end_date = vaccine_end_date;

    if (final_is_vaccine && vaccination_date) {
      const vaccDate = new Date(vaccination_date);

      if (!final_next_due_date) {
        final_next_due_date = new Date(vaccDate);
        final_next_due_date.setDate(final_next_due_date.getDate() + (vaccine_interval_days || 30));
        final_next_due_date = final_next_due_date.toISOString().split('T')[0];
      }

      if (!final_vaccine_end_date) {
        final_vaccine_end_date = new Date(vaccDate);
        final_vaccine_end_date.setMonth(final_vaccine_end_date.getMonth() + (vaccine_total_months || 12));
        final_vaccine_end_date = final_vaccine_end_date.toISOString().split('T')[0];
      }
    }

    const query = `
      INSERT INTO treatment_records
      (entity_id, farm_id, user_id, species, medication_type, is_vaccine, vaccine_interval_days, vaccine_total_months, next_due_date, vaccine_end_date, vet_id, vet_name, reason, cause, medicine, start_date, end_date, route, dose_amount, dose_unit, frequency_per_day, duration_days)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

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
      vet_id ? parseInt(vet_id) : null,
      vet_name || null,
      reason || null,
      cause || null,
      medicine,
      start_date,
      end_date,
      route,
      dose_amount ? (isNaN(parseFloat(dose_amount)) ? null : parseFloat(dose_amount)) : null,
      dose_unit,
      frequency_per_day ? (isNaN(parseInt(frequency_per_day)) ? null : parseInt(frequency_per_day)) : null,
      duration_days ? (isNaN(parseInt(duration_days)) ? null : parseInt(duration_days)) : null
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
        vaccine_end_date: final_vaccine_end_date
      });
    }

    // Auto-create AMU record with ML predictions (only for non-vaccine treatments)
    if (!final_is_vaccine) {
      const predictions = await this.getPredictions({
        species: entity.species,
        medication_type,
        medicine,
        route,
        dose_amount: dose_amount ? parseFloat(dose_amount) : null,
        dose_unit,
        frequency_per_day: frequency_per_day ? parseInt(frequency_per_day) : null,
        duration_days: duration_days ? parseInt(duration_days) : null,
        cause,
        reason,
        matrix: entity.matrix
      });

      if (predictions.error) {
        console.error('ML Prediction error:', predictions.error);
        // Continue with null predictions or default values
      }

      await this.createAMURecord(treatmentId, predictions);
    }

    return treatmentId;
  }

  // Auto-create AMU record
  static async createAMURecord(treatmentId, predictions) {
    const { predicted_mrl, predicted_withdrawal_days, predicted_mrl_risk, risk_category } = predictions;

    const insertQuery = `
      INSERT INTO amu_records (
        treatment_id, entity_id, farm_id, user_id,
        species, medication_type, matrix,
        medicine, active_ingredient, category_type,
        reason, cause,
        route, dose_amount, dose_unit,
        frequency_per_day, duration_days,
        start_date, end_date,
        predicted_mrl, predicted_withdrawal_days, predicted_mrl_risk, risk_category
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
        ?, ?, ?, ?
      FROM treatment_records tr
      JOIN animals_or_batches ao ON tr.entity_id = ao.entity_id
      WHERE tr.treatment_id = ?
    `;

    await db.execute(insertQuery, [
      predicted_mrl || null,
      predicted_withdrawal_days || null,
      predicted_mrl_risk || null,
      risk_category || 'safe',
      treatmentId
    ]);
  }

  // Get ML predictions
  static async getPredictions(inputData) {
    return new Promise((resolve) => {
      const pythonProcess = spawn('python', [
        path.join(__dirname, '../predict.py'),
        JSON.stringify(inputData)
      ]);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          resolve({ error: `Python process exited with code ${code}: ${errorOutput}` });
        } else {
          try {
            const result = JSON.parse(output.trim());
            resolve(result);
          } catch (e) {
            resolve({ error: `Failed to parse prediction output: ${output}` });
          }
        }
      });

      pythonProcess.on('error', (err) => {
        resolve({ error: `Failed to start Python process: ${err.message}` });
      });
    });
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
      SELECT * FROM treatment_records 
      WHERE entity_id = ?
      ORDER BY start_date DESC
    `;
    const [rows] = await db.execute(query, [entityId]);
    return rows;
  }

  // Get treatments with AMU records
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

  // Get all treatments by farmer (through their entities)
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

  // Get recent treatments (last 30 days)
  static async getRecent(farmerId, days = 30) {
    const query = `
      SELECT t.*, e.entity_type, e.tag_id, e.batch_name, e.species, f.farm_name
      FROM treatment_records t
      JOIN animals_or_batches e ON t.entity_id = e.entity_id
      JOIN farms f ON t.farm_id = f.farm_id
      WHERE f.farmer_id = ? 
        AND t.start_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ORDER BY t.start_date DESC
    `;
    const [rows] = await db.execute(query, [farmerId, days]);
    return rows;
  }
}

module.exports = Treatment;
