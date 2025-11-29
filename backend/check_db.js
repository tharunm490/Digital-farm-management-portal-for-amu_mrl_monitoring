const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function checkDB() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database
    });

    const [rows] = await connection.execute('SELECT * FROM treatment_records ORDER BY created_at DESC LIMIT 1');
    console.log('Latest Treatment:', rows[0]);

    const [amu] = await connection.execute('SELECT * FROM amu_records ORDER BY created_at DESC LIMIT 1');
    console.log('Latest AMU:', amu[0]);

    await connection.end();
}

checkDB();
