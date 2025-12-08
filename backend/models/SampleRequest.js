const db = require('../config/database');

class SampleRequest {
  static async create({ treatment_id, farmer_id, entity_id, assigned_lab_id, safe_date, status='requested' }) {
    const query = `
      INSERT INTO sample_requests (treatment_id, farmer_id, entity_id, assigned_lab_id, safe_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [res] = await db.execute(query, [treatment_id, farmer_id, entity_id, assigned_lab_id, safe_date, status]);
    return res.insertId;
  }

  static async updateStatus(sample_request_id, status) {
    const [res] = await db.execute('UPDATE sample_requests SET status = ? WHERE sample_request_id = ?', [status, sample_request_id]);
    return res.affectedRows;
  }

  static async getById(sample_request_id) {
    const [rows] = await db.execute('SELECT * FROM sample_requests WHERE sample_request_id = ?', [sample_request_id]);
    return rows[0];
  }

  static async listPendingForLab(lab_id) {
    const [rows] = await db.execute('SELECT sr.*, t.medicine, t.end_date, a.tag_id as entity_tag FROM sample_requests sr JOIN treatment_records t ON sr.treatment_id = t.treatment_id JOIN animals_or_batches a ON sr.entity_id = a.entity_id WHERE sr.assigned_lab_id = ? AND sr.status IN ("requested","approved")', [lab_id]);
    return rows;
  }
}

module.exports = SampleRequest;
