const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function inspectFarmersSchema() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Checking Farmers Table Schema ---');
        const [cols] = await connection.query('DESCRIBE farmers');
        cols.forEach(col => {
            console.log(`${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

inspectFarmersSchema();
