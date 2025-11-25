// TissueResult.js - Model for tissue-wise MRL results
const db = require('../config/database');

class TissueResult {
  static async create(data) {
    const { amu_id, tissue, predicted_mrl, base_mrl, risk_percent, risk_category } = data;
    const sql = `
      INSERT INTO amu_tissue_results 
      (amu_id, tissue, predicted_mrl, base_mrl, risk_percent, risk_category) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [amu_id, tissue, predicted_mrl, base_mrl, risk_percent, risk_category]);
    return result.insertId;
  }

  static async getByAmuId(amuId) {
    const sql = 'SELECT * FROM amu_tissue_results WHERE amu_id = ? ORDER BY tissue';
    const [rows] = await db.execute(sql, [amuId]);
    return rows;
  }

  static async getById(tissueId) {
    const sql = 'SELECT * FROM amu_tissue_results WHERE tissue_id = ?';
    const [rows] = await db.execute(sql, [tissueId]);
    return rows[0];
  }
}

module.exports = TissueResult;