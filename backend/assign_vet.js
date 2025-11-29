const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function assignVet() {
    try {
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database
        });

        // Hardcoded for reliability based on debug output
        const vetId = 19;
        const farmId = 1;

        // Assign
        await connection.execute('UPDATE farms SET vet_id = ? WHERE farm_id = ?', [vetId, farmId]);
        console.log(`Assigned Vet ${vetId} to Farm ${farmId}`);

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

assignVet();
