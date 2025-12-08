const db = require('../config/database');
const bcrypt = require('bcrypt');

const User = {
  // ================================================================
  // FARMER REGISTRATION (Aadhaar + Phone based)
  // ================================================================
  createFarmer: async (farmerData) => {
    const { display_name, aadhaar_number, phone, email, state, district, taluk } = farmerData;
    
    const [result] = await db.query(
      `INSERT INTO users (role, display_name, aadhaar_number, phone, email, state, district, taluk) 
       VALUES ('farmer', ?, ?, ?, ?, ?, ?, ?)`,
      [display_name, aadhaar_number, phone, email || null, state, district, taluk || null]
    );
    
    return result.insertId;
  },

  // ================================================================
  // AUTHORITY/VETERINARIAN/DISTRIBUTOR REGISTRATION (Google Auth based)
  // ================================================================
  createGoogleUser: async (userData) => {
    const { google_uid, email, display_name, role } = userData;
    
    // Only authority, veterinarian, and distributor can use Google login
    if (role === 'farmer') {
      throw new Error('Farmers cannot use Google login. Please use Aadhaar + OTP.');
    }
    
    // Validate role - match allowed roles in authRoutes.js
    if (!['authority', 'veterinarian', 'distributor', 'laboratory'].includes(role)) {
      throw new Error(`Invalid role for Google login: ${role}`);
    }
    
    const [result] = await db.query(
      `INSERT INTO users (role, display_name, email, auth_provider, google_uid) 
       VALUES (?, ?, ?, 'google', ?)`,
      [role, display_name, email, google_uid]
    );
    
    return result.insertId;
  },

  // ================================================================
  // FIND USER METHODS
  // ================================================================
  
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

  // Find user by Google UID
  findByGoogleUID: async (google_uid) => {
    const [users] = await db.query('SELECT * FROM users WHERE google_uid = ?', [google_uid]);
    return users[0];
  },

  // Find farmer by Aadhaar
  findByAadhaar: async (aadhaar_number) => {
    const [users] = await db.query(
      'SELECT * FROM users WHERE aadhaar_number = ? AND role = ?', 
      [aadhaar_number, 'farmer']
    );
    return users[0];
  },

  // Find farmer by Aadhaar + Phone combination
  findFarmerByAadhaarAndPhone: async (aadhaar_number, phone) => {
    const [users] = await db.query(
      'SELECT * FROM users WHERE aadhaar_number = ? AND phone = ? AND role = ?', 
      [aadhaar_number, phone, 'farmer']
    );
    return users[0];
  },

  // Check if Aadhaar is already used by any user
  isAadhaarUsed: async (aadhaar_number) => {
    const [users] = await db.query(
      'SELECT user_id, role FROM users WHERE aadhaar_number = ?', 
      [aadhaar_number]
    );
    return users[0] || null;
  },

  // ================================================================
  // GET USER WITH ROLE-SPECIFIC DETAILS
  // ================================================================
  
  // Get user with farmer details
  getUserWithFarmerDetails: async (user_id) => {
    const [rows] = await db.query(`
      SELECT u.*, f.farmer_id, f.address
      FROM users u
      LEFT JOIN farmers f ON u.user_id = f.user_id
      WHERE u.user_id = ?
    `, [user_id]);
    return rows[0];
  },

  // Get user with veterinarian details
  getUserWithVeterinarianDetails: async (user_id) => {
    const [rows] = await db.query(`
      SELECT u.*, v.vet_id, v.vet_name, v.license_number, 
             COALESCE(v.phone, u.phone) as phone
      FROM users u
      LEFT JOIN veterinarians v ON u.user_id = v.user_id
      WHERE u.user_id = ?
    `, [user_id]);
    return rows[0];
  },

  // Get user with authority details
  getUserWithAuthorityDetails: async (user_id) => {
    const [rows] = await db.query(`
      SELECT u.*, a.authority_id, a.department, a.designation, a.phone as authority_phone
      FROM users u
      LEFT JOIN authority_profiles a ON u.user_id = a.user_id
      WHERE u.user_id = ?
    `, [user_id]);
    return rows[0];
  },

  // Get user with distributor details
  getUserWithDistributorDetails: async (user_id) => {
    const [rows] = await db.query(`
      SELECT u.*, d.distributor_id, d.distributor_name, d.company_name, d.license_number,
             d.phone as distributor_phone, d.gst_number, d.address
      FROM users u
      LEFT JOIN distributors d ON u.user_id = d.user_id
      WHERE u.user_id = ?
    `, [user_id]);
    return rows[0];
  },

  // ================================================================
  // UPDATE USER (limited - role cannot be changed)
  // ================================================================
  update: async (user_id, userData) => {
    const { display_name, state, district, taluk } = userData;
    // NOTE: Role is NOT updateable - it's locked after first assignment
    const [result] = await db.query(
      'UPDATE users SET display_name = ?, state = ?, district = ?, taluk = ? WHERE user_id = ?',
      [display_name, state || null, district || null, taluk || null, user_id]
    );
    return result.affectedRows;
  },

  // Update farmer contact info
  updateFarmerContact: async (user_id, contactData) => {
    const { phone, email, state, district, taluk } = contactData;
    const [result] = await db.query(
      'UPDATE users SET phone = ?, email = ?, state = ?, district = ?, taluk = ? WHERE user_id = ? AND role = ?',
      [phone, email || null, state || null, district || null, taluk || null, user_id, 'farmer']
    );
    return result.affectedRows;
  }
};

const Farmer = {
  // Create farmer profile (linked to user)
  create: async (farmerData) => {
    const { user_id, address } = farmerData;
    const [result] = await db.query(
      'INSERT INTO farmers (user_id, address) VALUES (?, ?)',
      [user_id, address || null]
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
    const { address } = farmerData;
    const [result] = await db.query(
      'UPDATE farmers SET address = ? WHERE user_id = ?',
      [address || null, user_id]
    );
    return result.affectedRows;
  }
};

const Veterinarian = {
  // Create veterinarian profile (linked to user)
  create: async (veterinarianData) => {
    const { user_id, vet_name, license_number, phone } = veterinarianData;
    const [result] = await db.query(
      'INSERT INTO veterinarians (vet_id, user_id, vet_name, license_number, phone) VALUES (?, ?, ?, ?, ?)',
      [license_number, user_id, vet_name, license_number, phone || null]
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
    const { vet_name, license_number, phone } = veterinarianData;
    const [result] = await db.query(
      'UPDATE veterinarians SET vet_name = ?, license_number = ?, phone = ? WHERE user_id = ?',
      [vet_name, license_number, phone || null, user_id]
    );
    return result.affectedRows;
  },

  // Get veterinarians by location (for auto-assignment)
  getByLocation: async (state, district, taluk = null) => {
    // Join with users table to get location info
    let query = `
      SELECT v.*, u.display_name, u.email, u.state, u.district, u.taluk 
      FROM veterinarians v 
      JOIN users u ON v.user_id = u.user_id 
      WHERE u.state = ? AND u.district = ?
    `;
    const params = [state, district];
    
    if (taluk) {
      query += ' AND u.taluk = ?';
      params.push(taluk);
    }
    
    const [rows] = await db.query(query, params);
    return rows;
  }
};

// Authority Profile management
const Authority = {
  // Create authority profile
  create: async (authorityData) => {
    const { user_id, department, designation, phone, state, district, taluk } = authorityData;
    const [result] = await db.query(
      `INSERT INTO authority_profiles (user_id, department, designation, phone, state, district, taluk) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, department || null, designation || null, phone || null, state || null, district || null, taluk || null]
    );
    return result.insertId;
  },

  // Get authority by user_id
  getByUserId: async (user_id) => {
    const [rows] = await db.query('SELECT * FROM authority_profiles WHERE user_id = ?', [user_id]);
    return rows[0];
  },

  // Update authority profile
  update: async (user_id, authorityData) => {
    const { department, designation, phone, state, district, taluk } = authorityData;
    const [result] = await db.query(
      `UPDATE authority_profiles 
       SET department = ?, designation = ?, phone = ?, state = ?, district = ?, taluk = ? 
       WHERE user_id = ?`,
      [department || null, designation || null, phone || null, state || null, district || null, taluk || null, user_id]
    );
    return result.affectedRows;
  }
};

module.exports = { User, Farmer, Veterinarian, Authority };
