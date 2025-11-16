const db = require('../config/database');

const Monitoring = {
  // AML Records
  getAllAML: async () => {
    const [rows] = await db.query(`
      SELECT aml.*, c.crop_name, f.name as farm_name 
      FROM aml_records aml
      LEFT JOIN crops c ON aml.crop_id = c.id
      LEFT JOIN farms f ON c.farm_id = f.id
      ORDER BY aml.measured_date DESC
    `);
    return rows;
  },

  getAMLByCropId: async (cropId) => {
    const [rows] = await db.query('SELECT * FROM aml_records WHERE crop_id = ? ORDER BY measured_date DESC', [cropId]);
    return rows;
  },

  createAML: async (amlData) => {
    const { crop_id, parameter_name, minimum_value, current_value, unit, status, measured_date, notes } = amlData;
    const [result] = await db.query(
      'INSERT INTO aml_records (crop_id, parameter_name, minimum_value, current_value, unit, status, measured_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [crop_id, parameter_name, minimum_value, current_value, unit, status, measured_date, notes]
    );
    return result.insertId;
  },

  // MRL Records
  getAllMRL: async () => {
    const [rows] = await db.query(`
      SELECT mrl.*, c.crop_name, f.name as farm_name 
      FROM mrl_records mrl
      LEFT JOIN crops c ON mrl.crop_id = c.id
      LEFT JOIN farms f ON c.farm_id = f.id
      ORDER BY mrl.test_date DESC
    `);
    return rows;
  },

  getMRLByCropId: async (cropId) => {
    const [rows] = await db.query('SELECT * FROM mrl_records WHERE crop_id = ? ORDER BY test_date DESC', [cropId]);
    return rows;
  },

  createMRL: async (mrlData) => {
    const { crop_id, chemical_name, maximum_allowed, detected_level, unit, status, test_date, laboratory, notes } = mrlData;
    const [result] = await db.query(
      'INSERT INTO mrl_records (crop_id, chemical_name, maximum_allowed, detected_level, unit, status, test_date, laboratory, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [crop_id, chemical_name, maximum_allowed, detected_level, unit, status, test_date, laboratory, notes]
    );
    return result.insertId;
  },

  // Dashboard Statistics
  getDashboardStats: async () => {
    const [farmsCount] = await db.query('SELECT COUNT(*) as count FROM farms');
    const [cropsCount] = await db.query('SELECT COUNT(*) as count FROM crops');
    const [amlCritical] = await db.query('SELECT COUNT(*) as count FROM aml_records WHERE status = "critical"');
    const [mrlExceeded] = await db.query('SELECT COUNT(*) as count FROM mrl_records WHERE status = "exceeded"');
    
    return {
      totalFarms: farmsCount[0].count,
      totalCrops: cropsCount[0].count,
      amlCriticalAlerts: amlCritical[0].count,
      mrlExceededAlerts: mrlExceeded[0].count
    };
  }
};

module.exports = Monitoring;
