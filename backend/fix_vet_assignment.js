const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function fixAssignment() {
    try {
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database
        });

        const vetId = 24;
        const farmId = 15;

        console.log(`Assigning Vet ${vetId} to Farm ${farmId}...`);
        const [result] = await connection.execute('UPDATE farms SET vet_id = ? WHERE farm_id = ?', [vetId, farmId]);
        console.log('Rows affected:', result.affectedRows);

        await connection.end();
    } catch (error) {
        console.error(error);
    }
}

fixAssignment();
