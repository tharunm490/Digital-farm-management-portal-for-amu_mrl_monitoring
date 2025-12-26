const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function inspectTargeted() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Checking Users Table ---');
        const [usersCols] = await connection.query('DESCRIBE users');
        const roleCol = usersCols.find(c => c.Field === 'role');
        console.log('Role column exists:', !!roleCol);
        if (roleCol) console.log('Role type:', roleCol.Type);

        console.log('\n--- Checking Farms Table ---');
        const [farmsCols] = await connection.query('DESCRIBE farms');
        const vetIdCol = farmsCols.find(c => c.Field === 'vet_id');
        console.log('vet_id column exists:', !!vetIdCol);

        console.log('\n--- Checking Vets Table ---');
        try {
            const [vetsCols] = await connection.query('DESCRIBE vets');
            console.log('Vets table exists.');
            console.log('Columns:', vetsCols.map(c => c.Field).join(', '));
        } catch (e) {
            console.log('Vets table does NOT exist.');
        }

        console.log('\n--- Checking Authority Table ---');
        try {
            const [authCols] = await connection.query('DESCRIBE authority_users');
            console.log('Authority_users table exists.');
        } catch (e) {
            console.log('Authority_users table does NOT exist.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

inspectTargeted();
