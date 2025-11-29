const db = require('../config/database');
const bcrypt = require('bcrypt');

const User = {
  // Create new user (local registration)
  create: async (userData) => {
    const { email, password, display_name, role } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await db.query(
      `INSERT INTO users (auth_provider, email, password_hash, display_name, role) 
       VALUES ('local', ?, ?, ?, ?)`,
      [email, hashedPassword, display_name, role || 'farmer']
    );
    
    return result.insertId;
  },

  // Find user by email
  findByEmail: async (email) => {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return users[0];
  },

  // Find user by ID
  findById: async (user_id) => {
    const [users] = await db.query('SELECT * FROM users WHERE user_id = ?', [user_id]);
    return users[0];
  },

  // Get user with farmer details
  getUserWithFarmerDetails: async (user_id) => {
    const [rows] = await db.query(`
      SELECT u.*, f.farmer_id, f.phone, f.address, f.state, f.district, f.taluk
      FROM users u
      LEFT JOIN farmers f ON u.user_id = f.user_id
      WHERE u.user_id = ?
    `, [user_id]);
    return rows[0];
  },

  // Get user with veterinarian details
  getUserWithVeterinarianDetails: async (user_id) => {
    const [rows] = await db.query(`
      SELECT u.*, v.vet_id, v.vet_name, v.license_number, v.phone, v.state, v.district, v.taluk
      FROM users u
      LEFT JOIN veterinarians v ON u.user_id = v.user_id
      WHERE u.user_id = ?
    `, [user_id]);
    return rows[0];
  },

  // Update user
  update: async (user_id, userData) => {
    const { display_name, role } = userData;
    // Set default role if null or undefined
    const safeRole = role == null ? 'farmer' : role;
    const [result] = await db.query(
      'UPDATE users SET display_name = ?, role = ? WHERE user_id = ?',
      [display_name, safeRole, user_id]
    );
    return result.affectedRows;
  }
};

const Farmer = {
  // Create farmer profile
  create: async (farmerData) => {
    const { user_id, phone, address, state, district, taluk } = farmerData;
    const [result] = await db.query(
      'INSERT INTO farmers (user_id, phone, address, state, district, taluk) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, phone, address, state, district, taluk || null]
    );
    return result.insertId;
  },

  // Get farmer by user_id
  getByUserId: async (user_id) => {
    const [rows] = await db.query('SELECT * FROM farmers WHERE user_id = ?', [user_id]);
    return rows[0];
  },

  // Update farmer profile
  update: async (user_id, farmerData) => {
    const { phone, address, state, district, taluk } = farmerData;
    const [result] = await db.query(
      'UPDATE farmers SET phone = ?, address = ?, state = ?, district = ?, taluk = ? WHERE user_id = ?',
      [phone, address, state, district, taluk || null, user_id]
    );
    return result.affectedRows;
  }
};

const Veterinarian = {
  // Create veterinarian profile
  create: async (veterinarianData) => {
    const { user_id, vet_name, license_number, phone, state, district, taluk } = veterinarianData;
    const [result] = await db.query(
      'INSERT INTO veterinarians (vet_id, user_id, vet_name, license_number, phone, state, district, taluk) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [license_number, user_id, vet_name, license_number, phone, state, district, taluk]
    );
    return license_number;
  },

  // Get veterinarian by user_id
  getByUserId: async (user_id) => {
    const [rows] = await db.query('SELECT * FROM veterinarians WHERE user_id = ?', [user_id]);
    return rows[0];
  },

  // Update veterinarian profile
  update: async (user_id, veterinarianData) => {
    const { vet_name, license_number, phone, state, district, taluk } = veterinarianData;
    const [result] = await db.query(
      'UPDATE veterinarians SET vet_name = ?, license_number = ?, phone = ?, state = ?, district = ?, taluk = ? WHERE user_id = ?',
      [vet_name, license_number, phone, state, district, taluk, user_id]
    );
    return result.affectedRows;
  },

  // Get veterinarians by location (for auto-assignment)
  getByLocation: async (state, district, taluk = null) => {
    let query = 'SELECT v.*, u.display_name, u.email FROM veterinarians v JOIN users u ON v.user_id = u.user_id WHERE v.state = ? AND v.district = ?';
    const params = [state, district];
    
    if (taluk) {
      query += ' AND v.taluk = ?';
      params.push(taluk);
    }
    
    const [rows] = await db.query(query, params);
    return rows;
  }
};

module.exports = { User, Farmer, Veterinarian };
