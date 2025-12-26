const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function inspectPhoneColumn() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Checking Phone Column Length ---');
        const [cols] = await connection.query("SHOW COLUMNS FROM farmers LIKE 'phone'");
        console.log(cols);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

inspectPhoneColumn();
