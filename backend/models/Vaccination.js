const db = require('../config/database');
const Notification = require('./Notification');

class Vaccination {
  // Create new vaccination record (insert into treatment_records with is_vaccine=true)
  static async create(vaccData) {
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
        notes,
        user_id
      } = vaccData;

      // Get farm_id and species from entity
      const entityQuery = `SELECT farm_id, species FROM animals_or_batches WHERE entity_id = ?`;
      const [entityRows] = await db.execute(entityQuery, [entity_id]);
      if (entityRows.length === 0) throw new Error('Entity not found');
      const { farm_id, species } = entityRows[0];

      const query = `
        INSERT INTO treatment_records
        (entity_id, farm_id, user_id, species, medication_type, is_vaccine, medicine, start_date, dose_amount, dose_unit, route, status, vet_id, vet_name, reason)
        VALUES (?, ?, ?, ?, 'vaccine', true, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)
      `;

      const [result] = await db.execute(query, [
        entity_id,
        farm_id,
        user_id,
        species,
        vaccine_name,
        vaccination_date,
        dosage || null,
        'dose', // assuming unit
        route,
        vet_id || null,
        vet_name || null,
        notes || 'Vaccination'
      ]);

      // Create vaccination notification
      await Notification.create({
        user_id,
        type: 'vaccination',
        message: `Vaccination for ${vaccine_name} completed on ${vaccination_date}. Next due date: ${next_due_date || 'Not scheduled'}.`,
        entity_id,
        treatment_id: result.insertId
      });

      return result.insertId;
    } catch (error) {
      console.error('Create vaccination error:', error);
      throw error;
    }
  }

  // Get vaccinations by entity (from treatment_records where is_vaccine=true)
  static async getByEntity(entity_id) {
    try {
      const query = `
        SELECT * FROM treatment_records WHERE entity_id = ? AND is_vaccine = true ORDER BY start_date DESC
      `;
      const [rows] = await db.execute(query, [entity_id]);
      return rows;
    } catch (error) {
      console.error('Get vaccinations by entity error:', error);
      return [];
    }
  }

  // Get vaccination by ID (treatment_id)
  static async getById(treatment_id) {
    try {
      const query = `SELECT * FROM treatment_records WHERE treatment_id = ? AND is_vaccine = true`;
      const [rows] = await db.execute(query, [treatment_id]);
      return rows[0];
    } catch (error) {
      console.error('Get vaccination by ID error:', error);
      return null;
    }
  }

  // Get all vaccinations for a farmer
  static async getByFarmer(farmer_id) {
    try {
      const query = `
        SELECT tr.*, e.tag_id, e.batch_name, e.species, e.entity_type, f.farm_name
        FROM treatment_records tr
        JOIN animals_or_batches e ON tr.entity_id = e.entity_id
        JOIN farms f ON e.farm_id = f.farm_id
        WHERE f.farmer_id = ? AND tr.is_vaccine = true
        ORDER BY tr.start_date DESC
      `;
      const [rows] = await db.execute(query, [farmer_id]);
      return rows;
    } catch (error) {
      console.error('Get vaccinations by farmer error:', error);
      return [];
    }
  }

  // Get all vaccinations for a vet (mapped farms)
  static async getByVet(vet_id) {
    try {
      const query = `
        SELECT tr.*, e.tag_id, e.batch_name, e.species, e.entity_type, f.farm_name
        FROM treatment_records tr
        JOIN animals_or_batches e ON tr.entity_id = e.entity_id
        JOIN farms f ON e.farm_id = f.farm_id
        JOIN vet_farm_mapping vfm ON f.farm_id = vfm.farm_id
        WHERE vfm.vet_id = ? AND tr.is_vaccine = true
        ORDER BY tr.start_date DESC
      `;
      const [rows] = await db.execute(query, [vet_id]);
      return rows;
    } catch (error) {
      console.error('Get vaccinations by vet error:', error);
      return [];
    }
  }

  // Update vaccination
  static async update(treatment_id, vaccData) {
    try {
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
        UPDATE treatment_records
        SET medicine = ?, start_date = ?, dose_amount = ?, route = ?, vet_id = ?, vet_name = ?, reason = ?
        WHERE treatment_id = ? AND is_vaccine = true
      `;

      await db.execute(query, [
        vaccine_name,
        vaccination_date,
        dosage || null,
        route,
        vet_id || null,
        vet_name || null,
        notes || 'Vaccination',
        treatment_id
      ]);
    } catch (error) {
      console.error('Update vaccination error:', error);
      throw error;
    }
  }

  // Delete vaccination
  static async delete(treatment_id) {
    try {
      const query = `DELETE FROM treatment_records WHERE treatment_id = ? AND is_vaccine = true`;
      await db.execute(query, [treatment_id]);
    } catch (error) {
      console.error('Delete vaccination error:', error);
      throw error;
    }
  }

  // Get upcoming vaccinations (next 30 days) and create notifications
  static async getUpcoming(farmer_id, days = 30) {
    try {
      const query = `
        SELECT tr.*, e.tag_id, e.batch_name, e.species, e.entity_type, f.farm_name
        FROM treatment_records tr
        JOIN animals_or_batches e ON tr.entity_id = e.entity_id
        JOIN farms f ON e.farm_id = f.farm_id
        WHERE f.farmer_id = ? AND tr.is_vaccine = true AND tr.next_due_date IS NOT NULL
        AND tr.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        ORDER BY tr.next_due_date ASC
      `;
      const [rows] = await db.execute(query, [farmer_id, days]);
      
      // Create notifications for upcoming vaccinations
      for (const vaccination of rows) {
        // Check if notification already exists for this vaccination
        const existingNotificationQuery = `
          SELECT * FROM notification_history 
          WHERE user_id = ? 
          AND type = 'vaccination' 
          AND treatment_id = ? 
          AND DATE(created_at) = CURDATE()
        `;
        const [existing] = await db.execute(existingNotificationQuery, [farmer_id, vaccination.treatment_id]);
        
        if (existing.length === 0) {
          // Create notification for upcoming vaccination
          await Notification.create({
            user_id: farmer_id,
            type: 'vaccination',
            message: `Upcoming vaccination: ${vaccination.medicine} for ${vaccination.species} ${vaccination.tag_id || vaccination.batch_name} is due on ${vaccination.next_due_date}.`,
            entity_id: vaccination.entity_id,
            treatment_id: vaccination.treatment_id
          });
        }
      }
      
      return rows;
    } catch (error) {
      console.error('Get upcoming vaccinations error:', error);
      return [];
    }
  }

  // Get overdue vaccinations
  static async getOverdue(farmer_id) {
    try {
      const query = `
        SELECT tr.*, e.tag_id, e.batch_name, e.species, e.entity_type, f.farm_name,
               DATEDIFF(CURDATE(), tr.next_due_date) as days_overdue
        FROM treatment_records tr
        JOIN animals_or_batches e ON tr.entity_id = e.entity_id
        JOIN farms f ON e.farm_id = f.farm_id
        WHERE f.farmer_id = ? AND tr.is_vaccine = true AND tr.next_due_date IS NOT NULL
        AND tr.next_due_date < CURDATE()
        ORDER BY tr.next_due_date ASC
      `;
      const [rows] = await db.execute(query, [farmer_id]);
      return rows;
    } catch (error) {
      console.error('Get overdue vaccinations error:', error);
      return [];
    }
  }
}

module.exports = Vaccination;