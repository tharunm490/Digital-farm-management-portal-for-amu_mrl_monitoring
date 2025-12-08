const db = require('../config/database');

class Laboratory {
  static async create({ user_id, lab_name, license_number, phone, email, state, district, taluk, address }) {
    const query = `
      INSERT INTO laboratories (user_id, lab_name, license_number, phone, email, state, district, taluk, address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [user_id, lab_name, license_number, phone, email, state, district, taluk, address]);
    return result.insertId;
  }

  static async update(lab_id, data) {
    console.log(`\n>>> Laboratory.update(lab_id=${lab_id})`);
    
    const fields = Object.keys(data);
    if (fields.length === 0) {
      console.log('⚠️  No fields to update - returning 0');
      return 0;
    }
    
    console.log(`Fields to update: ${fields.join(', ')}`);
    
    const values = Object.values(data);
    const set = fields.map(f => `${f} = ?`).join(', ');
    const query = `UPDATE laboratories SET ${set} WHERE lab_id = ?`;
    
    console.log(`SQL Query: ${query}`);
    console.log(`Values: [${values.map(v => `'${v}'`).join(', ')}, ${lab_id}]`);
    
    values.push(lab_id);
    
    try {
      const [res] = await db.execute(query, values);
      console.log(`✅ Update successful - ${res.affectedRows} rows affected`);
      console.log(`   changedRows: ${res.changedRows}`);
      console.log(`   insertId: ${res.insertId}`);
      return res.affectedRows;
    } catch (error) {
      console.error(`❌ Database error:`, error.message);
      throw error;
    }
  }

  static async getByUserId(user_id) {
    const [rows] = await db.execute('SELECT * FROM laboratories WHERE user_id = ?', [user_id]);
    return rows[0];
  }

  static async getById(lab_id) {
    const [rows] = await db.execute('SELECT * FROM laboratories WHERE lab_id = ?', [lab_id]);
    return rows[0];
  }

  static async listAll() {
    const [rows] = await db.execute('SELECT * FROM laboratories');
    return rows;
  }

  // Find nearest lab by taluk -> district -> state -> any
  static async findNearestByLocation({ taluk, district, state }) {
    if (!taluk && !district && !state) {
      const [any] = await db.execute('SELECT * FROM laboratories LIMIT 1');
      return any[0] || null;
    }

    if (taluk) {
      const [rows] = await db.execute('SELECT * FROM laboratories WHERE taluk = ? LIMIT 1', [taluk]);
      if (rows && rows.length) return rows[0];
    }
    if (district) {
      const [rows] = await db.execute('SELECT * FROM laboratories WHERE district = ? LIMIT 1', [district]);
      if (rows && rows.length) return rows[0];
    }
    if (state) {
      const [rows] = await db.execute('SELECT * FROM laboratories WHERE state = ? LIMIT 1', [state]);
      if (rows && rows.length) return rows[0];
    }
    const [rows] = await db.execute('SELECT * FROM laboratories LIMIT 1');
    return rows[0] || null;
  }
}

module.exports = Laboratory;
