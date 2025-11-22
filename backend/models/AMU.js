const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// Load thresholds JSON
const thresholdsPath = path.join(__dirname, '../ml_models/s.json');
let thresholdsData = null;
try {
    thresholdsData = JSON.parse(fs.readFileSync(thresholdsPath, 'utf8'));
} catch (e) {
    console.warn('Failed to load thresholds JSON:', e.message);
}

function intToDate(intDate) {
  if (!intDate) return null;
  const dateStr = intDate.toString();
  if (dateStr.length !== 8) return null;
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return `${year}-${month}-${day}`;
}

function getThresholds(species, matrix, category, medicine) {
    if (!thresholdsData || !thresholdsData.data) return { safe_max: null, borderline_max: null, unsafe_above: null };
    const data = thresholdsData.data;
    species = species.toLowerCase();
    
    // Validate matrix for species
    const validMatrices = {
        'cattle': ['milk', 'meat'],
        'goat': ['meat'],
        'sheep': ['meat'],
        'pig': ['meat'],
        'poultry': ['meat', 'eggs']
    };
    
    if (!validMatrices[species] || !validMatrices[species].includes(matrix)) {
        return { safe_max: null, borderline_max: null, unsafe_above: null };
    }
    
    if (!data[species] || !data[species][category] || !data[species][category][medicine] || !data[species][category][medicine][matrix]) {
        return { safe_max: null, borderline_max: null, unsafe_above: null };
    }
    
    const thresholds = data[species][category][medicine][matrix].thresholds;
    if (!thresholds) {
        return { safe_max: null, borderline_max: null, unsafe_above: null };
    }
    
    return {
        safe_max: thresholds.safe_max || null,
        borderline_max: thresholds.borderline_max || null,
        unsafe_above: thresholds.unsafe_above || null
    };
}

function getMrlStatus(predicted_mrl, safe_max, borderline_max, unsafe_above) {
    if (safe_max === null || safe_max === undefined) {
        return { status: 'Safe', color: 'green' };
    }
    if (predicted_mrl <= safe_max) {
        return { status: 'Safe', color: 'green' };
    }
    if (predicted_mrl <= borderline_max) {
        return { status: 'Borderline', color: 'yellow' };
    }
    return { status: 'Unsafe', color: 'red' };
}

class AMU {
  // Create new AMU record (auto-filled from treatment)
  static async create(amuData) {
    const {
      treatment_id,
      entity_id,
      farm_id,
      user_id,
      species,
      medication_type,
      matrix,
      medicine,
      active_ingredient,
      category_type,
      reason,
      cause,
      route,
      dose_amount,
      dose_unit,
      frequency_per_day,
      duration_days,
      start_date,
      end_date,
      predicted_mrl,
      predicted_withdrawal_days,
      predicted_mrl_risk,
      risk_category
    } = amuData;

    // Override predicted_withdrawal_days for vaccine and vitamin categories
    let effectiveWithdrawalDays = predicted_withdrawal_days;
    if (category_type === 'vaccine' || category_type === 'vitamin') {
      effectiveWithdrawalDays = 0;
    }

    // Calculate safe_date
    let safe_date = null;
    if (end_date) {
      const endDateStr = intToDate(end_date);
      if (endDateStr) {
        const endDate = new Date(endDateStr);
        if (effectiveWithdrawalDays > 0) {
          endDate.setDate(endDate.getDate() + effectiveWithdrawalDays);
        }
        safe_date = endDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      }
    }

    const query = `
      INSERT INTO amu_records (
        treatment_id, entity_id, farm_id, user_id,
        species, medication_type, matrix,
        medicine, active_ingredient, category_type,
        reason, cause,
        route, dose_amount, dose_unit,
        frequency_per_day, duration_days,
        start_date, end_date,
        predicted_mrl, predicted_withdrawal_days, safe_date, predicted_mrl_risk, risk_category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      treatment_id,
      entity_id,
      farm_id,
      user_id,
      species,
      medication_type,
      matrix,
      medicine,
      active_ingredient,
      category_type,
      reason,
      cause,
      route,
      dose_amount,
      dose_unit,
      frequency_per_day,
      duration_days,
      start_date,
      end_date,
      predicted_mrl,
      effectiveWithdrawalDays,  // Use the overridden value
      safe_date,
      predicted_mrl_risk,
      risk_category
    ]);

    return result.insertId;
  }

  // Get all AMU records for a treatment
  static async getByTreatment(treatmentId) {
    const query = 'SELECT * FROM amu_records WHERE treatment_id = ? ORDER BY created_at DESC';
    const [rows] = await db.execute(query, [treatmentId]);
    return rows;
  }

  // Get single AMU record by ID
  static async getById(amuId) {
    const query = `
      SELECT a.*, t.medicine as treatment_medicine, e.species, e.tag_id, e.batch_name, f.farm_name
      FROM amu_records a
      JOIN treatment_records t ON a.treatment_id = t.treatment_id
      JOIN animals_or_batches e ON a.entity_id = e.entity_id
      JOIN farms f ON a.farm_id = f.farm_id
      WHERE a.amu_id = ?
    `;
    const [rows] = await db.execute(query, [amuId]);
    return rows[0];
  }

  // Get all AMU records for an entity
  static async getByEntity(entityId) {
    const query = `
      SELECT a.*, t.start_date as treatment_start, t.medicine as treatment_medicine
      FROM amu_records a
      JOIN treatment_records t ON a.treatment_id = t.treatment_id
      WHERE a.entity_id = ?
      ORDER BY a.start_date DESC
    `;
    const [rows] = await db.execute(query, [entityId]);
    return rows;
  }

  // Get all AMU records for a farmer
  static async getByFarmer(farmerId) {
    const query = `
      SELECT a.*, t.start_date as treatment_start, t.medicine as treatment_medicine,
             e.entity_type, e.tag_id, e.batch_name, e.species, f.farm_name
      FROM amu_records a
      JOIN treatment_records t ON a.treatment_id = t.treatment_id
      JOIN animals_or_batches e ON a.entity_id = e.entity_id
      JOIN farms f ON a.farm_id = f.farm_id
      WHERE f.farmer_id = ?
      ORDER BY a.start_date DESC
    `;
    const [rows] = await db.execute(query, [farmerId]);
    // Add thresholds and status to each record
    return rows.map(row => {
      const thresholds = getThresholds(row.species, row.matrix, row.medication_type, row.medicine);
      const status = getMrlStatus(row.predicted_mrl, thresholds.safe_max, thresholds.borderline_max, thresholds.unsafe_above);
      return { ...row, ...thresholds, ...status };
    });
  }

  // Get AMU records with active withdrawal periods
  static async getActiveWithdrawals(farmerId) {
    const query = `
      SELECT a.*, t.start_date as treatment_start, e.entity_type, e.tag_id, e.batch_name, e.species,
             DATEDIFF(DATE_ADD(a.end_date, INTERVAL a.predicted_withdrawal_days DAY), CURDATE()) as days_remaining
      FROM amu_records a
      JOIN treatment_records t ON a.treatment_id = t.treatment_id
      JOIN animals_or_batches e ON a.entity_id = e.entity_id
      JOIN farms f ON a.farm_id = f.farm_id
      WHERE f.farmer_id = ?
        AND a.predicted_withdrawal_days IS NOT NULL
        AND CURDATE() < DATE_ADD(a.end_date, INTERVAL a.predicted_withdrawal_days DAY)
      ORDER BY days_remaining ASC
    `;
    const [rows] = await db.execute(query, [farmerId]);
    return rows;
  }

  // Get AMU statistics for a farmer
  static async getStats(farmerId) {
    const query = `
      SELECT
        COUNT(*) as total_records,
        AVG(predicted_mrl) as avg_mrl,
        AVG(predicted_withdrawal_days) as avg_withdrawal,
        SUM(CASE WHEN risk_category = 'safe' THEN 1 ELSE 0 END) as safe_count,
        SUM(CASE WHEN risk_category = 'borderline' THEN 1 ELSE 0 END) as borderline_count,
        SUM(CASE WHEN risk_category = 'unsafe' THEN 1 ELSE 0 END) as unsafe_count
      FROM amu_records a
      JOIN farms f ON a.farm_id = f.farm_id
      WHERE f.farmer_id = ?
    `;
    const [rows] = await db.execute(query, [farmerId]);
    return rows[0];
  }
}

module.exports = AMU;
