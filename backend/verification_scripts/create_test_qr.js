const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;
const crypto = require('crypto');

async function createTestQR() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database
        });

        const entity_id = 1; // Assuming entity 1 exists
        const hash = crypto.createHash('sha256').update(`test_qr_${Date.now()}`).digest('hex');

        console.log(`Creating QR for Entity ${entity_id} with Hash: ${hash}`);

        const query = `INSERT INTO qr_records (entity_id, qr_payload, qr_hash) VALUES (?, ?, ?)`;
        await connection.execute(query, [entity_id, `http://localhost:3000/verify/${hash}`, hash]);

        console.log('QR Record Created Successfully');
        console.log('HASH:', hash);

    } catch (error) {
        console.error('Error creating QR:', error);
    } finally {
        if (connection) await connection.end();
    }
}

createTestQR();
