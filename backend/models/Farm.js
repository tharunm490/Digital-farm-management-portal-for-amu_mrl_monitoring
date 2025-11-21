const db = require('../config/database');

const Farm = {
  // Get all farms for a farmer
  getByFarmerId: async (farmer_id) => {
    const [rows] = await db.query(`
      SELECT f.*, 
             (SELECT COUNT(*) FROM animals_or_batches WHERE farm_id = f.farm_id) as entity_count
      FROM farms f
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
             fr.phone, fr.address, fr.state, fr.district
      FROM farms f
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN users u ON fr.user_id = u.user_id
      WHERE f.farm_id = ?
    `, [farm_id]);
    return rows[0];
  },

  // Create new farm
  create: async (farmData) => {
    const { farmer_id, farm_name, latitude, longitude } = farmData;
    const [result] = await db.query(
      'INSERT INTO farms (farmer_id, farm_name, latitude, longitude) VALUES (?, ?, ?, ?)',
      [farmer_id, farm_name, latitude, longitude]
    );
    return result.insertId;
  },

  // ...existing code...
};

module.exports = Farm;
