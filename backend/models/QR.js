const db = require('../config/database');
const crypto = require('crypto');

const QR = {
  // Create QR record
  create: async (qrData) => {
    const { entity_id, qr_payload } = qrData;
    
    const hash = crypto.createHash('sha256').update(qr_payload).digest('hex');
    
    const [result] = await db.query(
      'INSERT INTO qr_records (entity_id, qr_payload, qr_hash) VALUES (?, ?, ?)',
      [entity_id, qr_payload, hash]
    );
    return result.insertId;
  },

  // Get QR by entity_id
  getByEntityId: async (entity_id) => {
    const [rows] = await db.query(
      'SELECT * FROM qr_records WHERE entity_id = ? ORDER BY created_at DESC LIMIT 1',
      [entity_id]
    );
    return rows[0];
  },

  // Update QR record
  update: async (entity_id, qr_image, qr_url) => {
    const hash = crypto.createHash('sha256').update(qr_url).digest('hex');
    
    const [result] = await db.query(
      'UPDATE qr_records SET qr_payload = ?, qr_hash = ? WHERE entity_id = ?',
      [qr_url, hash, entity_id]
    );
    return result.affectedRows;
  }
};

const TamperProof = {
  // Create tamper-proof log
  create: async (logData) => {
    const { entity_type, entity_id, record_hash } = logData;
    
    const [result] = await db.query(
      'INSERT INTO tamper_proof_log (entity_type, entity_id, record_hash) VALUES (?, ?, ?)',
      [entity_type, entity_id, record_hash]
    );
    
    return { id: result.insertId, hash: record_hash };
  },

  // Verify record hash
  verify: async (entity_type, entity_id, record_data) => {
    const [rows] = await db.query(
      'SELECT record_hash FROM tamper_proof_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT 1',
      [entity_type, entity_id]
    );
    
    if (rows.length === 0) return { verified: false, message: 'No record found' };
    
    const storedHash = rows[0].record_hash;
    
    return {
      verified: storedHash === record_data,
      message: storedHash === record_data ? 'Record hash verified. No tampering detected.' : 'Hash mismatch detected!'
    };
  }
};

module.exports = { QR, TamperProof };
