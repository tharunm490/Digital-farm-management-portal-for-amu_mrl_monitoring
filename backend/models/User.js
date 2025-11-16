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
      SELECT u.*, f.farmer_id, f.phone, f.address, f.state, f.district
      FROM users u
      LEFT JOIN farmers f ON u.user_id = f.user_id
      WHERE u.user_id = ?
    `, [user_id]);
    return rows[0];
  },

  // Update user
  update: async (user_id, userData) => {
    const { display_name, role } = userData;
    const [result] = await db.query(
      'UPDATE users SET display_name = ?, role = ? WHERE user_id = ?',
      [display_name, role, user_id]
    );
    return result.affectedRows;
  }
};

const Farmer = {
  // Create farmer profile
  create: async (farmerData) => {
    const { user_id, phone, address, state, district } = farmerData;
    const [result] = await db.query(
      'INSERT INTO farmers (user_id, phone, address, state, district) VALUES (?, ?, ?, ?, ?)',
      [user_id, phone, address, state, district]
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
    const { phone, address, state, district } = farmerData;
    const [result] = await db.query(
      'UPDATE farmers SET phone = ?, address = ?, state = ?, district = ? WHERE user_id = ?',
      [phone, address, state, district, user_id]
    );
    return result.affectedRows;
  }
};

module.exports = { User, Farmer };
