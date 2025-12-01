const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function inspectSchema() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        const [tables] = await connection.query('SHOW TABLES');
        console.log('Tables:', tables.map(t => Object.values(t)[0]));

        const tablesToDescribe = ['users', 'farms', 'animals', 'batches', 'treatment_records', 'prescriptions', 'vaccinations'];

        for (const table of tablesToDescribe) {
            try {
                const [columns] = await connection.query(`DESCRIBE ${table}`);
                console.log(`\nSchema for ${table}:`);
                columns.forEach(col => {
                    console.log(`- ${col.Field} (${col.Type}) ${col.Key ? `[${col.Key}]` : ''}`);
                });
            } catch (err) {
                console.log(`\nTable ${table} does not exist.`);
            }
        }

    } catch (err) {
        console.error('Error inspecting schema:', err);
    } finally {
        await connection.end();
    }
}

inspectSchema();
