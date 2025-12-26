const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function testRawInsert() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Testing Raw SQL Insert ---');

        // 1. Create a dummy user first (needed for FK)
        const [userRes] = await connection.query(`
        INSERT INTO users (auth_provider, email, password_hash, display_name, role) 
        VALUES ('local', 'raw_test_${Date.now()}@example.com', 'hash', 'Raw Test', 'veterinarian')
    `);
        const userId = userRes.insertId;
        console.log('User created:', userId);

        // 2. Insert into veterinarians
        const sql = 'INSERT INTO veterinarians (user_id, vet_name, license_number, phone, state, district, taluk) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const params = [userId, 'Raw Vet', 'RAW-LIC', '123', 'State', 'District', 'Taluk'];

        console.log('Executing:', sql);
        console.log('Params:', params);

        const [vetRes] = await connection.query(sql, params);
        console.log('Veterinarian created:', vetRes.insertId);
        console.log('✅ Raw Insert PASSED');

    } catch (err) {
        console.error('❌ Raw Insert FAILED:', err);
    } finally {
        await connection.end();
    }
}

testRawInsert();
