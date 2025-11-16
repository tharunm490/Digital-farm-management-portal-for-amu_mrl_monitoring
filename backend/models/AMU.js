const db = require('../config/database');

class AMU {
  // Create new AMU record (linked to treatment)
  static async create(amuData) {
    const {
      treatment_id,
      medicine_name,
      active_ingredient,
      dose,
      route,
      start_date,
      end_date,
      withdrawal_period
    } = amuData;

    const query = `
      INSERT INTO amu_records 
      (treatment_id, medicine_name, active_ingredient, dose, route, start_date, end_date, withdrawal_period)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      treatment_id,
      medicine_name,
      active_ingredient || null,
      dose,
      route,
      start_date,
      end_date || null,
      withdrawal_period || null
    ]);

    return result.insertId;
  }

  // Get all AMU records for a treatment
  static async getByTreatment(treatmentId) {
    const query = 'SELECT * FROM amu_records WHERE treatment_id = ? ORDER BY start_date DESC';
    const [rows] = await db.execute(query, [treatmentId]);
    return rows;
  }

  // Get single AMU record by ID
  static async getById(amuId) {
    const query = `
      SELECT a.*, t.entity_id, t.disease_condition, e.species, e.tag_id, e.batch_name
      FROM amu_records a
      JOIN treatment_records t ON a.treatment_id = t.treatment_id
      JOIN animals_or_batches e ON t.entity_id = e.entity_id
      WHERE a.amu_id = ?
    `;
    const [rows] = await db.execute(query, [amuId]);
    return rows[0];
  }

  // Get all AMU records for an entity (through treatments)
  static async getByEntity(entityId) {
    const query = `
      SELECT a.*, t.start_date as treatment_start, t.active_ingredient as treatment_medicine
      FROM amu_records a
      JOIN treatment_records t ON a.treatment_id = t.treatment_id
      WHERE t.entity_id = ?
      ORDER BY a.start_date DESC
    `;
    const [rows] = await db.execute(query, [entityId]);
    return rows;
  }

  // Get all AMU records for an entity by entity_id directly
  static async getByEntityId(entityId) {
    const query = `
      SELECT * FROM amu_records
      WHERE entity_id = ?
      ORDER BY start_date DESC
    `;
    const [rows] = await db.execute(query, [entityId]);
    return rows;
  }

  // Get all AMU records for a farmer (through their entities)
  static async getByFarmer(farmerId) {
    const query = `
      SELECT a.*, t.treatment_date, t.disease_condition, 
             e.entity_type, e.tag_id, e.batch_name, e.species, e.farm_name
      FROM amu_records a
      JOIN treatment_records t ON a.treatment_id = t.treatment_id
      JOIN animals_or_batches e ON t.entity_id = e.entity_id
      WHERE e.farmer_id = ?
      ORDER BY a.start_date DESC
    `;
    const [rows] = await db.execute(query, [farmerId]);
    return rows;
  }

  // Update AMU record
  static async update(amuId, updateData) {
    const allowedFields = [
      'medicine_name', 'active_ingredient', 'dose', 'route', 
      'start_date', 'end_date', 'withdrawal_period'
    ];
    const updates = [];
    const values = [];
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(amuId);
    
    const query = `UPDATE amu_records SET ${updates.join(', ')} WHERE amu_id = ?`;
    const [result] = await db.execute(query, values);
    
    return result.affectedRows > 0;
  }

  // Delete AMU record
  static async delete(amuId) {
    const query = 'DELETE FROM amu_records WHERE amu_id = ?';
    const [result] = await db.execute(query, [amuId]);
    return result.affectedRows > 0;
  }

  // Get AMU records with active withdrawal periods
  static async getActiveWithdrawals(farmerId) {
    const query = `
      SELECT a.*, t.treatment_date, e.entity_type, e.tag_id, e.batch_name, e.species,
             DATEDIFF(DATE_ADD(a.end_date, INTERVAL a.withdrawal_period DAY), CURDATE()) as days_remaining
      FROM amu_records a
      JOIN treatment_records t ON a.treatment_id = t.treatment_id
      JOIN animals_or_batches e ON t.entity_id = e.entity_id
      WHERE e.farmer_id = ? 
        AND a.withdrawal_period IS NOT NULL
        AND CURDATE() < DATE_ADD(a.end_date, INTERVAL a.withdrawal_period DAY)
      ORDER BY days_remaining ASC
    `;
    const [rows] = await db.execute(query, [farmerId]);
    return rows;
  }
}

module.exports = AMU;
