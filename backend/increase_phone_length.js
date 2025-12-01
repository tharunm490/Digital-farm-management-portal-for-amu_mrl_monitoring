const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function increasePhoneLength() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Increasing Phone Column Length ---');

        // Increase for farmers
        await connection.query('ALTER TABLE farmers MODIFY COLUMN phone VARCHAR(50)');
        console.log('farmers.phone length increased to 50.');

        // Increase for veterinarians
        await connection.query('ALTER TABLE veterinarians MODIFY COLUMN phone VARCHAR(50)');
        console.log('veterinarians.phone length increased to 50.');

    } catch (err) {
        console.error('Error increasing phone length:', err);
    } finally {
        await connection.end();
    }
}

increasePhoneLength();
