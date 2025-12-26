const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function check() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    const [rows] = await connection.query('SELECT farm_id, farm_name, vet_id FROM farms ORDER BY farm_id DESC LIMIT 5');
    console.log('Recent Farms:', JSON.stringify(rows, null, 2));

    const [vets] = await connection.query('SELECT vet_id, user_id FROM veterinarians');
    console.log('Vets:', JSON.stringify(vets, null, 2));

    await connection.end();
}

check();
