const db = require('../config/database');

const Distributor = {
  // Create distributor profile (linked to user)
  create: async (distributorData) => {
    const { 
      user_id, distributor_name, company_name, license_number, 
      phone, email, address, state, district, taluk, gst_number 
    } = distributorData;
    
    const [result] = await db.query(
      `INSERT INTO distributors 
       (user_id, distributor_name, company_name, license_number, phone, email, address, state, district, taluk, gst_number) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, distributor_name, company_name, license_number || null, phone, email || null, 
       address || null, state || null, district || null, taluk || null, gst_number || null]
    );
    return result.insertId;
  },

  // Get distributor by user_id
  getByUserId: async (user_id) => {
    const [rows] = await db.query('SELECT * FROM distributors WHERE user_id = ?', [user_id]);
    return rows[0];
  },

  // Get distributor by distributor_id
  getById: async (distributor_id) => {
    const [rows] = await db.query('SELECT * FROM distributors WHERE distributor_id = ?', [distributor_id]);
    return rows[0];
  },

  // Update distributor profile
  update: async (user_id, distributorData) => {
    const { 
      distributor_name, company_name, license_number, 
      phone, email, address, state, district, taluk, gst_number 
    } = distributorData;
    
    const [result] = await db.query(
      `UPDATE distributors 
       SET distributor_name = ?, company_name = ?, license_number = ?, phone = ?, 
           email = ?, address = ?, state = ?, district = ?, taluk = ?, gst_number = ?
       WHERE user_id = ?`,
      [distributor_name, company_name, license_number || null, phone, email || null,
       address || null, state || null, district || null, taluk || null, gst_number || null, user_id]
    );
    return result.affectedRows;
  },

  // Get all distributors
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT d.*, u.display_name, u.email as user_email
      FROM distributors d
      JOIN users u ON d.user_id = u.user_id
      ORDER BY d.created_at DESC
    `);
    return rows;
  }
};

const DistributorVerificationLog = {
  // Create verification log entry
  create: async (logData) => {
    const { 
      distributor_id, qr_id, entity_id, verification_status, 
      is_withdrawal_safe, safe_date, reason 
    } = logData;
    
    const [result] = await db.query(
      `INSERT INTO distributor_verification_logs 
       (distributor_id, qr_id, entity_id, verification_status, is_withdrawal_safe, safe_date, reason) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [distributor_id, qr_id, entity_id, verification_status, is_withdrawal_safe, safe_date || null, reason || null]
    );
    return result.insertId;
  },

  // Get verification logs by distributor
  getByDistributorId: async (distributor_id, limit = 50) => {
    const [rows] = await db.query(`
      SELECT dvl.*, q.qr_code, e.tag_number, e.species, f.farm_name
      FROM distributor_verification_logs dvl
      LEFT JOIN qr_records q ON dvl.qr_id = q.qr_id
      LEFT JOIN animals_or_batches e ON dvl.entity_id = e.entity_id
      LEFT JOIN farms f ON e.farm_id = f.farm_id
      WHERE dvl.distributor_id = ?
      ORDER BY dvl.scanned_at DESC
      LIMIT ?
    `, [distributor_id, limit]);
    return rows;
  },

  // Get verification log by ID
  getById: async (log_id) => {
    const [rows] = await db.query(`
      SELECT dvl.*, q.qr_code, e.tag_number, e.species, d.distributor_name, d.company_name
      FROM distributor_verification_logs dvl
      LEFT JOIN qr_records q ON dvl.qr_id = q.qr_id
      LEFT JOIN animals_or_batches e ON dvl.entity_id = e.entity_id
      LEFT JOIN distributors d ON dvl.distributor_id = d.distributor_id
      WHERE dvl.log_id = ?
    `, [log_id]);
    return rows[0];
  },

  // Get statistics for a distributor
  getStats: async (distributor_id) => {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_scans,
        SUM(CASE WHEN verification_status = 'accepted' THEN 1 ELSE 0 END) as accepted_count,
        SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN is_withdrawal_safe = 1 THEN 1 ELSE 0 END) as safe_count,
        SUM(CASE WHEN is_withdrawal_safe = 0 THEN 1 ELSE 0 END) as unsafe_count
      FROM distributor_verification_logs
      WHERE distributor_id = ?
    `, [distributor_id]);
    return rows[0];
  },

  // Get recent verifications across all distributors (for authority view)
  getRecent: async (limit = 100) => {
    const [rows] = await db.query(`
      SELECT dvl.*, q.qr_code, e.tag_number, e.species, d.distributor_name, d.company_name
      FROM distributor_verification_logs dvl
      LEFT JOIN qr_records q ON dvl.qr_id = q.qr_id
      LEFT JOIN animals_or_batches e ON dvl.entity_id = e.entity_id
      LEFT JOIN distributors d ON dvl.distributor_id = d.distributor_id
      ORDER BY dvl.scanned_at DESC
      LIMIT ?
    `, [limit]);
    return rows;
  }
};

module.exports = { Distributor, DistributorVerificationLog };
