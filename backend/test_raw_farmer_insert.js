const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function testRawFarmerInsert() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Testing Raw Farmer Insert ---');

        // 1. Create a dummy user first (needed for FK)
        const [userRes] = await connection.query(`
        INSERT INTO users (auth_provider, email, password_hash, display_name, role) 
        VALUES ('local', 'raw_farmer_${Date.now()}@test.com', 'hash', 'Raw Farmer', 'farmer')
    `);
        const userId = userRes.insertId;
        console.log('User created:', userId);

        // 2. Insert into farmers
        const sql = 'INSERT INTO farmers (user_id, phone, address, state, district) VALUES (?, ?, ?, ?, ?)';
        const params = [userId, 'Enter your phone number', 'Address', 'State', 'District'];

        console.log('Executing:', sql);
        console.log('Params:', params);

        const [farmerRes] = await connection.query(sql, params);
        console.log('Farmer created:', farmerRes.insertId);
        console.log('✅ Raw Farmer Insert PASSED');

    } catch (err) {
        console.error('❌ Raw Farmer Insert FAILED:', err);
    } finally {
        await connection.end();
    }
}

testRawFarmerInsert();
