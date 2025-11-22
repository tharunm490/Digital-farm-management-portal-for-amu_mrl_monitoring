const db = require('../config/database');
const Notification = require('./Notification');

class VaccinationHistory {
  // Create new vaccination history record
  static async create(vaccData) {
    const {
      entity_id,
      treatment_id,
      vaccine_name,
      given_date,
      interval_days,
      next_due_date,
      vaccine_total_months,
      vaccine_end_date,
      user_id
    } = vaccData;

    const query = `
      INSERT INTO vaccination_history
      (entity_id, treatment_id, vaccine_name, given_date, interval_days, next_due_date, vaccine_total_months, vaccine_end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      entity_id,
      treatment_id,
      vaccine_name,
      given_date,
      interval_days,
      next_due_date,
      vaccine_total_months || null,
      vaccine_end_date || null
    ]);

    // Create notification
    await Notification.create({
      user_id,
      type: 'vaccination',
      message: `Vaccination for ${vaccine_name} given on ${given_date}, next due ${next_due_date}.`,
      entity_id,
      treatment_id,
      vacc_id: result.insertId
    });

    return result.insertId;
  }

  // Get vaccination history for an entity
  static async getByEntity(entityId) {
    const query = `
      SELECT vh.*, tr.medication_type, tr.medicine, e.tag_id, e.batch_name, e.species, f.farm_name
      FROM vaccination_history vh
      JOIN treatment_records tr ON vh.treatment_id = tr.treatment_id
      JOIN animals_or_batches e ON vh.entity_id = e.entity_id
      JOIN farms f ON e.farm_id = f.farm_id
      WHERE vh.entity_id = ?
      ORDER BY vh.given_date DESC
    `;
    const [rows] = await db.execute(query, [entityId]);
    return rows;
  }

  // Get vaccination history for a farmer
  static async getByFarmer(farmerId) {
    const query = `
      SELECT vh.*, tr.medication_type, tr.medicine, e.entity_type, e.tag_id, e.batch_name, e.species, f.farm_name
      FROM vaccination_history vh
      JOIN treatment_records tr ON vh.treatment_id = tr.treatment_id
      JOIN animals_or_batches e ON vh.entity_id = e.entity_id
      JOIN farms f ON e.farm_id = f.farm_id
      WHERE f.farmer_id = ?
      ORDER BY vh.next_due_date ASC
    `;
    const [rows] = await db.execute(query, [farmerId]);
    return rows;
  }

  // Get upcoming vaccinations (due within next 30 days)
  static async getUpcomingVaccinations(farmerId, days = 30) {
    const query = `
      SELECT vh.*, tr.medication_type, tr.medicine, e.entity_type, e.tag_id, e.batch_name, e.species, f.farm_name,
             DATEDIFF(vh.next_due_date, CURDATE()) as days_until_due
      FROM vaccination_history vh
      JOIN treatment_records tr ON vh.treatment_id = tr.treatment_id
      JOIN animals_or_batches e ON vh.entity_id = e.entity_id
      JOIN farms f ON e.farm_id = f.farm_id
      WHERE f.farmer_id = ?
        AND vh.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        AND vh.next_due_date > CURDATE()
      ORDER BY vh.next_due_date ASC
    `;
    const [rows] = await db.execute(query, [farmerId, days]);
    return rows;
  }

  // Get overdue vaccinations
  static async getOverdueVaccinations(farmerId) {
    const query = `
      SELECT vh.*, tr.medication_type, tr.medicine, e.entity_type, e.tag_id, e.batch_name, e.species, f.farm_name,
             DATEDIFF(CURDATE(), vh.next_due_date) as days_overdue
      FROM vaccination_history vh
      JOIN treatment_records tr ON vh.treatment_id = tr.treatment_id
      JOIN animals_or_batches e ON vh.entity_id = e.entity_id
      JOIN farms f ON e.farm_id = f.farm_id
      WHERE f.farmer_id = ?
        AND vh.next_due_date < CURDATE()
      ORDER BY vh.next_due_date ASC
    `;
    const [rows] = await db.execute(query, [farmerId]);
    return rows;
  }

  // Update vaccination record (for when vaccine is given)
  static async updateVaccination(vaccId, updateData) {
    const { given_date, next_due_date } = updateData;

    const query = `
      UPDATE vaccination_history
      SET given_date = ?, next_due_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE vacc_id = ?
    `;

    await db.execute(query, [given_date, next_due_date, vaccId]);
  }

  // Get vaccination schedule for an entity
  static async getVaccinationSchedule(entityId) {
    const query = `
      SELECT vh.*, tr.medication_type, tr.medicine
      FROM vaccination_history vh
      JOIN treatment_records tr ON vh.treatment_id = tr.treatment_id
      WHERE vh.entity_id = ?
      ORDER BY vh.next_due_date ASC
    `;
    const [rows] = await db.execute(query, [entityId]);
    return rows;
  }

  // Get vaccination history by treatment
  static async getByTreatment(treatment_id) {
    const query = `
      SELECT * FROM vaccination_history WHERE treatment_id = ? ORDER BY given_date DESC
    `;
    const [rows] = await db.execute(query, [treatment_id]);
    return rows;
  }

  // Get vaccination history by ID
  static async getById(vaccId) {
    const query = `
      SELECT vh.*, tr.medication_type, tr.medicine, e.entity_type, e.tag_id, e.batch_name, e.species, f.farm_name
      FROM vaccination_history vh
      JOIN treatment_records tr ON vh.treatment_id = tr.treatment_id
      JOIN animals_or_batches e ON vh.entity_id = e.entity_id
      JOIN farms f ON e.farm_id = f.farm_id
      WHERE vh.vacc_id = ?
    `;
    const [rows] = await db.execute(query, [vaccId]);
    return rows[0];
  }
}

module.exports = VaccinationHistory;
