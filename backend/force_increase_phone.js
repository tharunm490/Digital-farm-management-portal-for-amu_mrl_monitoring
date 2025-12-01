const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function forceIncreasePhone() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Force Increasing Phone Column Length to 255 ---');

        // Increase for farmers
        await connection.query('ALTER TABLE farmers MODIFY COLUMN phone VARCHAR(255)');
        console.log('farmers.phone length increased to 255.');

        // Increase for veterinarians
        await connection.query('ALTER TABLE veterinarians MODIFY COLUMN phone VARCHAR(255)');
        console.log('veterinarians.phone length increased to 255.');

        // Verify
        const [cols] = await connection.query("SHOW COLUMNS FROM farmers LIKE 'phone'");
        console.log('Verified Schema:', cols);

    } catch (err) {
        console.error('Error increasing phone length:', err);
    } finally {
        await connection.end();
    }
}

forceIncreasePhone();
