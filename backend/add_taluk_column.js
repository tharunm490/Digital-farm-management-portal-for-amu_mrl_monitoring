const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function addTalukColumn() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Adding taluk column to veterinarians table ---');

        const [cols] = await connection.query('DESCRIBE veterinarians');
        const talukCol = cols.find(c => c.Field === 'taluk');

        if (!talukCol) {
            console.log('Adding taluk column...');
            await connection.query('ALTER TABLE veterinarians ADD COLUMN taluk VARCHAR(100)');
            console.log('taluk column added.');
        } else {
            console.log('taluk column already exists.');
        }

    } catch (err) {
        console.error('Error adding column:', err);
    } finally {
        await connection.end();
    }
}

addTalukColumn();
