const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function fixAutoIncrement() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Fixing vet_id Auto Increment ---');

        // Modify column to be AUTO_INCREMENT
        // Note: We need to specify the full definition. Assuming INT PRIMARY KEY.
        await connection.query('ALTER TABLE veterinarians MODIFY COLUMN vet_id INT AUTO_INCREMENT');
        console.log('vet_id modified to AUTO_INCREMENT.');

    } catch (err) {
        console.error('Error fixing auto increment:', err);
    } finally {
        await connection.end();
    }
}

fixAutoIncrement();
