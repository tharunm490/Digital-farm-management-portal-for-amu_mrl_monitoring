const db = require('../config/database');

class Treatment {
  // Create new treatment record
  static async create(treatmentData) {
    const {
      entity_id,
      user_id,
      active_ingredient,
      dose_mg_per_kg,
      route,
      frequency_per_day,
      duration_days,
      start_date,
      end_date,
      withdrawal_period_days
    } = treatmentData;

    // Get entity details to populate additional fields
    const db = require('../config/database');
    const [entityRows] = await db.execute('SELECT * FROM animals_or_batches WHERE entity_id = ?', [entity_id]);
    const entity = entityRows[0];
    
    if (!entity) {
      throw new Error('Entity not found');
    }

    // Auto-calculate withdrawal_end_date
    let withdrawal_end_date = null;
    if (end_date && withdrawal_period_days) {
      const endDateObj = new Date(end_date);
      endDateObj.setDate(endDateObj.getDate() + parseInt(withdrawal_period_days));
      withdrawal_end_date = endDateObj.toISOString().split('T')[0];
    }

    const query = `
      INSERT INTO treatment_records 
      (entity_id, farm_id, user_id, species, breed, tag_or_batch, reason, product_type, 
       medicine, dose_mg_per_kg, route, frequency_per_day, 
       duration_days, start_date, end_date, withdrawal_period_days, withdrawal_end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const tag_or_batch = entity.entity_type === 'animal' ? entity.tag_id : entity.batch_name;

    const [result] = await db.execute(query, [
      entity_id,
      entity.farm_id,
      user_id,
      entity.species,
      entity.breed || null,
      tag_or_batch,
      null, // reason
      entity.matrix, // product_type
      active_ingredient, // medicine (using active_ingredient value)
      dose_mg_per_kg,
      route,
      frequency_per_day,
      duration_days,
      start_date,
      end_date,
      withdrawal_period_days || null,
      withdrawal_end_date
    ]);

    return result.insertId;
  }

  // Get treatment by ID
  static async getById(treatmentId) {
    const query = `
      SELECT t.*, e.entity_type, e.tag_id, e.batch_name, e.species, e.breed
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
      SELECT t.*, e.entity_type, e.tag_id, e.batch_name, e.species, e.breed, f.farm_name
      FROM treatment_records t
      JOIN animals_or_batches e ON t.entity_id = e.entity_id
      JOIN farms f ON t.farm_id = f.farm_id
      WHERE f.farmer_id = ?
      ORDER BY t.start_date DESC
    `;
    const [rows] = await db.execute(query, [farmerId]);
    return rows;
  }

  // Update treatment record
  static async update(treatmentId, updateData) {
    const allowedFields = [
      'active_ingredient', 'dose_mg_per_kg', 'route', 
      'frequency_per_day', 'duration_days', 'start_date', 
      'end_date', 'withdrawal_period_days'
    ];
    
    const updates = [];
    const values = [];
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    // Auto-calculate withdrawal_end_date if end_date or withdrawal_period_days is being updated
    if (updateData.end_date || updateData.withdrawal_period_days) {
      const endDate = updateData.end_date;
      const withdrawalPeriod = updateData.withdrawal_period_days;
      
      if (endDate && withdrawalPeriod) {
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + parseInt(withdrawalPeriod));
        const withdrawal_end_date = endDateObj.toISOString().split('T')[0];
        
        updates.push('withdrawal_end_date = ?');
        values.push(withdrawal_end_date);
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(treatmentId);
    
    const query = `UPDATE treatment_records SET ${updates.join(', ')} WHERE treatment_id = ?`;
    const [result] = await db.execute(query, values);
    
    return result.affectedRows > 0;
  }

  // Delete treatment (will cascade delete AMU records if foreign key is set)
  static async delete(treatmentId) {
    const query = 'DELETE FROM treatment_records WHERE treatment_id = ?';
    const [result] = await db.execute(query, [treatmentId]);
    return result.affectedRows > 0;
  }

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
