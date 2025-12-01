const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function inspectFarmers() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Checking Farmers Table ---');
        try {
            const [farmersCols] = await connection.query('DESCRIBE farmers');
            console.log('Farmers table exists.');
            console.log('Columns:', farmersCols.map(c => c.Field).join(', '));
        } catch (e) {
            console.log('Farmers table does NOT exist.');
        }

        console.log('\n--- Checking Veterinarians Table ---');
        try {
            const [vetsCols] = await connection.query('DESCRIBE veterinarians');
            console.log('Veterinarians table exists.');
            console.log('Columns:', vetsCols.map(c => c.Field).join(', '));
        } catch (e) {
            console.log('Veterinarians table does NOT exist.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

inspectFarmers();
