const db = require('../config/database');

const Veterinarian = {
  // Create veterinarian profile
  create: async (vetData) => {
    const { user_id, vet_name, license_number, phone } = vetData;
    const [result] = await db.query(
      'INSERT INTO veterinarians (vet_id, user_id, vet_name, license_number, phone) VALUES (?, ?, ?, ?, ?)',
      [license_number, user_id, vet_name, license_number, phone]
    );
    return license_number;
  },

  // Get veterinarian by user_id
  getByUserId: async (user_id) => {
    const [rows] = await db.query('SELECT * FROM veterinarians WHERE user_id = ?', [user_id]);
    return rows[0];
  },

  // Get veterinarian by ID
  getById: async (vet_id) => {
    const [rows] = await db.query('SELECT * FROM veterinarians WHERE vet_id = ?', [vet_id]);
    return rows[0];
  },

  // Find vets by location (uses users table for location)
  findByLocation: async (state, district = null, taluk = null) => {
    let query = `
      SELECT v.*, u.state, u.district, u.taluk 
      FROM veterinarians v 
      JOIN users u ON v.user_id = u.user_id 
      WHERE u.state = ?
    `;
    let params = [state];

    if (taluk) {
      query += ' AND u.district = ? AND u.taluk = ?';
      params.push(district, taluk);
    } else if (district) {
      query += ' AND u.district = ?';
      params.push(district);
    }

    query += ' LIMIT 1';
    const [rows] = await db.query(query, params);
    return rows[0];
  },

  // Update veterinarian profile
  update: async (user_id, vetData) => {
    const { vet_name, license_number, phone } = vetData;
    const [result] = await db.query(
      'UPDATE veterinarians SET vet_name = ?, license_number = ?, phone = ? WHERE user_id = ?',
      [vet_name, license_number, phone, user_id]
    );
    return result.affectedRows;
  }
};

module.exports = Veterinarian;