const db = require('../config/database');

class Vaccination {
  // Create new vaccination record
  static async create(vaccData) {
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
      notes,
      user_id
    } = vaccData;

    const query = `
      INSERT INTO vaccinations
      (entity_id, vaccine_name, vaccination_date, next_due_date, batch_number, manufacturer, vet_id, vet_name, dosage, route, notes, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      entity_id,
      vaccine_name,
      vaccination_date,
      next_due_date || null,
      batch_number || null,
      manufacturer || null,
      vet_id || null,
      vet_name || null,
      dosage || null,
      route,
      notes || null,
      user_id
    ]);

    return result.insertId;
  }

  // Get vaccinations by entity
  static async getByEntity(entity_id) {
    const query = `
      SELECT * FROM vaccinations WHERE entity_id = ? ORDER BY vaccination_date DESC
    `;
    const [rows] = await db.execute(query, [entity_id]);
    return rows;
  }

  // Get vaccination by ID
  static async getById(vaccination_id) {
    const query = `SELECT * FROM vaccinations WHERE vaccination_id = ?`;
    const [rows] = await db.execute(query, [vaccination_id]);
    return rows[0];
  }

  // Get all vaccinations for a farmer
  static async getByFarmer(farmer_id) {
    const query = `
      SELECT v.*, e.tag_id, e.batch_name, e.species, e.entity_type, f.farm_name
      FROM vaccinations v
      JOIN animals_or_batches e ON v.entity_id = e.entity_id
      JOIN farms f ON e.farm_id = f.farm_id
      WHERE f.farmer_id = ?
      ORDER BY v.vaccination_date DESC
    `;
    const [rows] = await db.execute(query, [farmer_id]);
    return rows;
  }

  // Update vaccination
  static async update(vaccination_id, vaccData) {
    const {
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
    } = vaccData;

    const query = `
      UPDATE vaccinations
      SET vaccine_name = ?, vaccination_date = ?, next_due_date = ?, batch_number = ?, manufacturer = ?, vet_id = ?, vet_name = ?, dosage = ?, route = ?, notes = ?
      WHERE vaccination_id = ?
    `;

    await db.execute(query, [
      vaccine_name,
      vaccination_date,
      next_due_date || null,
      batch_number || null,
      manufacturer || null,
      vet_id || null,
      vet_name || null,
      dosage || null,
      route,
      notes || null,
      vaccination_id
    ]);
  }

  // Delete vaccination
  static async delete(vaccination_id) {
    const query = `DELETE FROM vaccinations WHERE vaccination_id = ?`;
    await db.execute(query, [vaccination_id]);
  }

  // Get upcoming vaccinations (next 30 days)
  static async getUpcoming(farmer_id, days = 30) {
    const query = `
      SELECT v.*, e.tag_id, e.batch_name, e.species, e.entity_type, f.farm_name
      FROM vaccinations v
      JOIN animals_or_batches e ON v.entity_id = e.entity_id
      JOIN farms f ON e.farm_id = f.farm_id
      WHERE f.farmer_id = ? AND v.next_due_date IS NOT NULL
      AND v.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY v.next_due_date ASC
    `;
    const [rows] = await db.execute(query, [farmer_id, days]);
    return rows;
  }
}

module.exports = Vaccination;