const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function fixAutoIncrementFK() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Fixing vet_id Auto Increment with FK handling ---');

        // 1. Drop FK from farms
        try {
            await connection.query('ALTER TABLE farms DROP FOREIGN KEY fk_farms_vet');
            console.log('Dropped FK fk_farms_vet');
        } catch (e) {
            console.log('FK fk_farms_vet might not exist or error dropping:', e.message);
        }

        // 2. Modify column
        await connection.query('ALTER TABLE veterinarians MODIFY COLUMN vet_id INT AUTO_INCREMENT');
        console.log('vet_id modified to AUTO_INCREMENT.');

        // 3. Re-add FK
        // Note: Ensure vet_id in farms is also INT (it should be)
        await connection.query(`
        ALTER TABLE farms 
        ADD CONSTRAINT fk_farms_vet 
        FOREIGN KEY (vet_id) REFERENCES veterinarians(vet_id) ON DELETE SET NULL
    `);
        console.log('Re-added FK fk_farms_vet');

    } catch (err) {
        console.error('Error fixing auto increment:', err);
    } finally {
        await connection.end();
    }
}

fixAutoIncrementFK();
