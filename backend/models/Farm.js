const db = require('../config/database');

const Farm = {
  // Get all farms for a farmer
  getByFarmerId: async (farmer_id) => {
    const [rows] = await db.query(`
      SELECT f.*, u.display_name as farmer_name,
             (SELECT COUNT(*) FROM animals_or_batches WHERE farm_id = f.farm_id) as entity_count
      FROM farms f
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN users u ON fr.user_id = u.user_id
      WHERE f.farmer_id = ?
      ORDER BY f.created_at DESC
    `, [farmer_id]);
    return rows;
  },

  // Get all farms
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT f.*, fr.farmer_id, u.display_name as farmer_name,
             (SELECT COUNT(*) FROM animals_or_batches WHERE farm_id = f.farm_id) as entity_count
      FROM farms f
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN users u ON fr.user_id = u.user_id
      ORDER BY f.created_at DESC
    `);
    return rows;
  },

  // Get farm by ID
  getById: async (farm_id) => {
    const [rows] = await db.query(`
      SELECT f.*, fr.farmer_id, u.display_name as farmer_name, u.email as farmer_email,
             u.phone, u.state, u.district, u.taluk
      FROM farms f
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN users u ON fr.user_id = u.user_id
      WHERE f.farm_id = ?
    `, [farm_id]);
    return rows[0];
  },

  // Check if farm with same name exists for farmer
  checkDuplicate: async (farmer_id, farm_name) => {
    const [rows] = await db.query(
      'SELECT farm_id FROM farms WHERE farmer_id = ? AND farm_name = ?',
      [farmer_id, farm_name]
    );
    return rows.length > 0;
  },

  // Create new farm
  create: async (farmData) => {
    const { farmer_id, farm_name, latitude, longitude } = farmData;
    const [result] = await db.query(
      'INSERT INTO farms (farmer_id, farm_name, latitude, longitude) VALUES (?, ?, ?, ?)',
      [farmer_id, farm_name, latitude, longitude]
    );
    const farmId = result.insertId;

    // Auto-assign veterinarian based on farmer's location (location is in users table)
    try {
      const [userRows] = await db.query(`
        SELECT u.state, u.district, u.taluk 
        FROM farmers fr 
        JOIN users u ON fr.user_id = u.user_id 
        WHERE fr.farmer_id = ?
      `, [farmer_id]);
      if (userRows && userRows[0]) {
        const VetFarmMapping = require('./VetFarmMapping');
        await VetFarmMapping.autoAssignVet(farmId, userRows[0].state, userRows[0].district, userRows[0].taluk);
      }
    } catch (error) {
      console.warn('Failed to auto-assign veterinarian:', error.message);
      // Don't fail farm creation if vet assignment fails
    }

    return farmId;
  },

  // Get farms mapped to a vet
  getByVetId: async (vet_id) => {
    const [rows] = await db.query(`
      SELECT f.*, fr.farmer_id, u.display_name as farmer_name, u.email as farmer_email,
             u.phone, u.state, u.district, u.taluk
      FROM farms f
      JOIN vet_farm_mapping vfm ON vfm.farm_id = f.farm_id
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN users u ON fr.user_id = u.user_id
      WHERE vfm.vet_id = ?
      ORDER BY f.created_at DESC
    `, [vet_id]);
    return rows;
  },

  // Update farm
  update: async (farm_id, farmData) => {
    const { farm_name, latitude, longitude } = farmData;
    const [result] = await db.query(
      'UPDATE farms SET farm_name = ?, latitude = ?, longitude = ? WHERE farm_id = ?',
      [farm_name, latitude, longitude, farm_id]
    );
    return result.affectedRows;
  },

  // Delete farm
  delete: async (farm_id) => {
    const [result] = await db.query('DELETE FROM farms WHERE farm_id = ?', [farm_id]);
    return result.affectedRows;
  }
};

module.exports = Farm;
