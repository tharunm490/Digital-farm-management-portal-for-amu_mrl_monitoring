const db = require('../config/database');

const Crop = {
  // Get all crops
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT c.*, f.name as farm_name, f.location 
      FROM crops c 
      LEFT JOIN farms f ON c.farm_id = f.id 
      ORDER BY c.created_at DESC
    `);
    return rows;
  },

  // Get crop by ID
  getById: async (id) => {
    const [rows] = await db.query(`
      SELECT c.*, f.name as farm_name, f.location 
      FROM crops c 
      LEFT JOIN farms f ON c.farm_id = f.id 
      WHERE c.id = ?
    `, [id]);
    return rows[0];
  },

  // Get crops by farm ID
  getByFarmId: async (farmId) => {
    const [rows] = await db.query('SELECT * FROM crops WHERE farm_id = ? ORDER BY planting_date DESC', [farmId]);
    return rows;
  },

  // Create new crop
  create: async (cropData) => {
    const { farm_id, crop_name, variety, planting_date, expected_harvest_date, area_cultivated, status } = cropData;
    const [result] = await db.query(
      'INSERT INTO crops (farm_id, crop_name, variety, planting_date, expected_harvest_date, area_cultivated, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [farm_id, crop_name, variety, planting_date, expected_harvest_date, area_cultivated, status || 'planted']
    );
    return result.insertId;
  },

  // ...existing code...
};

module.exports = Crop;
