const db = require('../config/database');

const Veterinarian = {
    // Create veterinarian profile
    create: async (vetData) => {
        const { user_id, license_number, phone, state, district } = vetData;
        const [result] = await db.query(
            'INSERT INTO veterinarians (user_id, license_number, phone, state, district) VALUES (?, ?, ?, ?, ?)',
            [user_id, license_number, phone, state, district]
        );
        return result.insertId;
    },

    // Get veterinarian by user_id
    getByUserId: async (user_id) => {
        const [rows] = await db.query('SELECT * FROM veterinarians WHERE user_id = ?', [user_id]);
        return rows[0];
    },

    // Update veterinarian profile
    update: async (user_id, vetData) => {
        const { phone, state, district } = vetData;
        const [result] = await db.query(
            'UPDATE veterinarians SET phone = ?, state = ?, district = ? WHERE user_id = ?',
            [phone, state, district, user_id]
        );
        return result.affectedRows;
    }
};

module.exports = Veterinarian;
