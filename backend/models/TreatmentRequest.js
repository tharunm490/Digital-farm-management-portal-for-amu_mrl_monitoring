const db = require('../config/database');

const TreatmentRequest = {
  // Create treatment request
  create: async (requestData) => {
    const { farm_id, entity_id, farmer_id, vet_id, species, symptoms } = requestData;
    const [result] = await db.query(
      'INSERT INTO treatment_requests (farm_id, entity_id, farmer_id, vet_id, species, symptoms) VALUES (?, ?, ?, ?, ?, ?)',
      [farm_id, entity_id, farmer_id, vet_id, species, symptoms]
    );
    return result.insertId;
  },

  // Get requests for a vet
  getByVet: async (vet_id) => {
    const [rows] = await db.query(`
      SELECT tr.*, a.species, a.tag_id, a.batch_name, f.farm_name,
             u.display_name as farmer_name, fr.phone as farmer_phone,
             CASE 
               WHEN tr.status = 'approved' AND tr.vet_id != ? THEN 'handled_by_other'
               WHEN tr.status = 'approved' AND tr.vet_id = ? THEN 'handled_by_me'
               ELSE 'pending'
             END as handling_status,
             CASE 
               WHEN tr.status = 'approved' AND tr.vet_id != ? THEN 
                 (SELECT CONCAT('Dr. ', v.vet_name) FROM veterinarians v WHERE v.vet_id = tr.vet_id)
               ELSE NULL
             END as handled_by_vet
      FROM treatment_requests tr
      JOIN animals_or_batches a ON a.entity_id = tr.entity_id
      JOIN farms f ON f.farm_id = tr.farm_id
      JOIN farmers fr ON fr.farmer_id = tr.farmer_id
      JOIN users u ON u.user_id = fr.user_id
      WHERE tr.vet_id = ? AND tr.status IN ('pending', 'approved')
      ORDER BY tr.created_at DESC
    `, [vet_id, vet_id, vet_id, vet_id]);
    return rows;
  },

  // Get requests by farmer
  getByFarmer: async (farmer_id) => {
    const [rows] = await db.query(`
      SELECT tr.*, a.species, a.tag_id, a.batch_name, f.farm_name,
             v.vet_name, u.display_name as vet_user_name
      FROM treatment_requests tr
      JOIN animals_or_batches a ON a.entity_id = tr.entity_id
      JOIN farms f ON f.farm_id = tr.farm_id
      JOIN veterinarians v ON v.vet_id = tr.vet_id
      JOIN users u ON u.user_id = v.user_id
      WHERE tr.farmer_id = ?
      ORDER BY tr.created_at DESC
    `, [farmer_id]);
    return rows;
  },

  // Get requests by farm
  getByFarm: async (farm_id) => {
    const [rows] = await db.query(`
      SELECT tr.*, a.species, a.tag_id, a.batch_name,
             v.vet_name, u.display_name as vet_user_name
      FROM treatment_requests tr
      JOIN animals_or_batches a ON a.entity_id = tr.entity_id
      JOIN veterinarians v ON v.vet_id = tr.vet_id
      JOIN users u ON u.user_id = v.user_id
      WHERE tr.farm_id = ?
      ORDER BY tr.created_at DESC
    `, [farm_id]);
    return rows;
  },

  // Update status
  updateStatus: async (request_id, status) => {
    const [result] = await db.query(
      'UPDATE treatment_requests SET status = ? WHERE request_id = ?',
      [status, request_id]
    );
    return result.affectedRows;
  },

  // Get request by ID
  getById: async (request_id) => {
    const [rows] = await db.query(`
      SELECT tr.*, a.species, a.tag_id, a.batch_name, f.farm_name,
             fr.farmer_id, u.display_name as farmer_name, v.vet_id, vu.display_name as vet_name
      FROM treatment_requests tr
      JOIN animals_or_batches a ON a.entity_id = tr.entity_id
      JOIN farms f ON f.farm_id = tr.farm_id
      JOIN farmers fr ON fr.farmer_id = tr.farmer_id
      JOIN users u ON u.user_id = fr.user_id
      LEFT JOIN veterinarians v ON tr.vet_id = v.vet_id
      LEFT JOIN users vu ON v.user_id = vu.user_id
      WHERE tr.request_id = ?
    `, [request_id]);
    return rows[0];
  }
};

module.exports = TreatmentRequest;