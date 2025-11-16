const db = require('../config/database');

const Batch = {
  // Get all batches for a farm
  getByFarmId: async (farm_id) => {
    const [rows] = await db.query(`
      SELECT b.*, f.farm_name
      FROM batches b
      LEFT JOIN farms f ON b.farm_id = f.farm_id
      WHERE b.farm_id = ?
      ORDER BY b.created_at DESC
    `, [farm_id]);
    return rows;
  },

  // Get all batches (with farm and farmer info)
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT b.*, f.farm_name, u.display_name as farmer_name
      FROM batches b
      LEFT JOIN farms fm ON b.farm_id = fm.farm_id
      LEFT JOIN farmers f ON fm.farmer_id = f.farmer_id
      LEFT JOIN users u ON f.user_id = u.user_id
      ORDER BY b.created_at DESC
    `);
    return rows;
  },

  // Get batch by ID
  getById: async (batch_id) => {
    const [rows] = await db.query(`
      SELECT b.*, f.farm_name, f.latitude, f.longitude, 
             fr.phone, fr.address, fr.state, fr.district,
             u.display_name as farmer_name, u.email as farmer_email
      FROM batches b
      LEFT JOIN farms f ON b.farm_id = f.farm_id
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN users u ON fr.user_id = u.user_id
      WHERE b.batch_id = ?
    `, [batch_id]);
    return rows[0];
  },

  // Create new batch
  create: async (batchData) => {
    const { farm_id, species, breed, matrix } = batchData;
    const [result] = await db.query(
      'INSERT INTO batches (farm_id, species, breed, matrix) VALUES (?, ?, ?, ?)',
      [farm_id, species, breed, matrix]
    );
    return result.insertId;
  },

  // Update batch
  update: async (batch_id, batchData) => {
    const { species, breed, matrix } = batchData;
    const [result] = await db.query(
      'UPDATE batches SET species = ?, breed = ?, matrix = ? WHERE batch_id = ?',
      [species, breed, matrix, batch_id]
    );
    return result.affectedRows;
  },

  // Delete batch
  delete: async (batch_id) => {
    const [result] = await db.query('DELETE FROM batches WHERE batch_id = ?', [batch_id]);
    return result.affectedRows;
  }
};

module.exports = Batch;
