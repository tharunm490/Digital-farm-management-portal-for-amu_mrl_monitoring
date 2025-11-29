const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function debugDB() {
    try {
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database
        });

        console.log('--- USERS ---');
        const [users] = await connection.execute('SELECT user_id, email, role FROM users');
        console.log(JSON.stringify(users, null, 2));

        console.log('--- FARMS ---');
        const [farms] = await connection.execute('SELECT farm_id, farm_name, farmer_id, vet_id FROM farms');
        console.log(JSON.stringify(farms, null, 2));

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

debugDB();
