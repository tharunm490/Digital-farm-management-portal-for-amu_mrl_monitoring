const db = require('../config/database');

class Entity {
  // Create new entity (animal or batch)
  static async create(entityData) {
    const {
      farm_id,
      entity_type,
      species,
      tag_id,
      batch_name,
      matrix,
      batch_count
    } = entityData;

    const query = `
      INSERT INTO animals_or_batches 
      (farm_id, entity_type, species, tag_id, batch_name, matrix, batch_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

      // If entity_type is 'animal', batch_count should be 1
      const finalBatchCount = entity_type === 'animal' ? 1 : (batch_count || null);
      const [result] = await db.execute(query, [
        farm_id,
        entity_type,
        species,
        tag_id || null,
        batch_name || null,
        matrix,
        finalBatchCount
      ]);

    return result.insertId;
  }

  // Get all entities for a farmer (via their farms)
  static async getAllByFarmer(farmerId) {
    const query = `
      SELECT e.*, f.farm_name, f.latitude, f.longitude 
      FROM animals_or_batches e
      JOIN farms f ON e.farm_id = f.farm_id
      WHERE f.farmer_id = ? 
      ORDER BY e.created_at DESC
    `;
    const [rows] = await db.execute(query, [farmerId]);
    return rows;
  }

  // Get all entities for a specific farm
  static async getAllByFarm(farmId) {
    const query = `
      SELECT e.*, f.farm_name 
      FROM animals_or_batches e
      JOIN farms f ON e.farm_id = f.farm_id
      WHERE e.farm_id = ? 
      ORDER BY e.created_at DESC
    `;
    const [rows] = await db.execute(query, [farmId]);
    return rows;
  }

  // Get single entity by ID
  static async getById(entityId) {
    const query = `
      SELECT e.*, f.farm_name, f.latitude, f.longitude 
      FROM animals_or_batches e
      LEFT JOIN farms f ON e.farm_id = f.farm_id
      WHERE e.entity_id = ?
    `;
    const [rows] = await db.execute(query, [entityId]);
    return rows[0];
  }

  // Get entities by farm name
  static async getByFarmName(farmerId, farmName) {
    const query = `
      SELECT e.*, f.farm_name 
      FROM animals_or_batches e
      JOIN farms f ON e.farm_id = f.farm_id
      WHERE f.farmer_id = ? AND f.farm_name LIKE ?
      ORDER BY e.created_at DESC
    `;
    const [rows] = await db.execute(query, [farmerId, `%${farmName}%`]);
    return rows;
  }

  // Get entities by type (animal or batch)
  static async getByType(farmerId, entityType) {
    const query = `
      SELECT e.*, f.farm_name 
      FROM animals_or_batches e
      JOIN farms f ON e.farm_id = f.farm_id
      WHERE f.farmer_id = ? AND e.entity_type = ?
      ORDER BY e.created_at DESC
    `;
    const [rows] = await db.execute(query, [farmerId, entityType]);
    return rows;
  }

  // ...existing code...

  // Get entity with treatment and AMU history
  static async getWithHistory(entityId) {
    const entityQuery = 'SELECT * FROM animals_or_batches WHERE entity_id = ?';
    const [entityRows] = await db.execute(entityQuery, [entityId]);
    
    if (entityRows.length === 0) {
      return null;
    }

    const treatmentQuery = `
      SELECT t.*, a.medicine_name, a.dose, a.route, a.withdrawal_period
      FROM treatment_records t
      LEFT JOIN amu_records a ON t.treatment_id = a.treatment_id
      WHERE t.entity_id = ?
      ORDER BY t.treatment_date DESC
    `;
    const [treatmentRows] = await db.execute(treatmentQuery, [entityId]);

    return {
      entity: entityRows[0],
      treatments: treatmentRows
    };
  }

  // Search entities
  static async search(farmerId, searchParams) {
    let query = `
      SELECT e.*, f.farm_name 
      FROM animals_or_batches e
      JOIN farms f ON e.farm_id = f.farm_id
      WHERE f.farmer_id = ?
    `;
    const values = [farmerId];

    if (searchParams.entity_type) {
      query += ' AND e.entity_type = ?';
      values.push(searchParams.entity_type);
    }

    if (searchParams.species) {
      query += ' AND e.species = ?';
      values.push(searchParams.species);
    }

    if (searchParams.farm_id) {
      query += ' AND e.farm_id = ?';
      values.push(searchParams.farm_id);
    }

    if (searchParams.tag_id) {
      query += ' AND e.tag_id LIKE ?';
      values.push(`%${searchParams.tag_id}%`);
    }

    if (searchParams.batch_name) {
      query += ' AND e.batch_name LIKE ?';
      values.push(`%${searchParams.batch_name}%`);
    }

    query += ' ORDER BY e.created_at DESC';

    const [rows] = await db.execute(query, values);
    return rows;
  }
}

module.exports = Entity;
