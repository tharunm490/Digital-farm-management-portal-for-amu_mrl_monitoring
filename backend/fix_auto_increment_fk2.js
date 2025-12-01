const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function fixAutoIncrementFK2() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Fixing vet_id Auto Increment with multiple FK handling ---');

        // 1. Drop FK from farms
        try {
            await connection.query('ALTER TABLE farms DROP FOREIGN KEY fk_farms_vet');
            console.log('Dropped FK fk_farms_vet');
        } catch (e) {
            console.log('FK fk_farms_vet drop error (might not exist):', e.message);
        }

        // 2. Drop FK from vet_farm_mapping
        try {
            await connection.query('ALTER TABLE vet_farm_mapping DROP FOREIGN KEY vet_farm_mapping_ibfk_1');
            console.log('Dropped FK vet_farm_mapping_ibfk_1');
        } catch (e) {
            console.log('FK vet_farm_mapping_ibfk_1 drop error (might not exist):', e.message);
        }

        // 3. Modify column
        await connection.query('ALTER TABLE veterinarians MODIFY COLUMN vet_id INT AUTO_INCREMENT');
        console.log('vet_id modified to AUTO_INCREMENT.');

        // 4. Re-add FKs
        try {
            await connection.query(`
            ALTER TABLE farms 
            ADD CONSTRAINT fk_farms_vet 
            FOREIGN KEY (vet_id) REFERENCES veterinarians(vet_id) ON DELETE SET NULL
        `);
            console.log('Re-added FK fk_farms_vet');
        } catch (e) { console.error('Error re-adding fk_farms_vet:', e.message); }

        try {
            await connection.query(`
            ALTER TABLE vet_farm_mapping 
            ADD CONSTRAINT vet_farm_mapping_ibfk_1 
            FOREIGN KEY (vet_id) REFERENCES veterinarians(vet_id) ON DELETE CASCADE
        `);
            console.log('Re-added FK vet_farm_mapping_ibfk_1');
        } catch (e) { console.error('Error re-adding vet_farm_mapping_ibfk_1:', e.message); }

    } catch (err) {
        console.error('Error fixing auto increment:', err);
    } finally {
        await connection.end();
    }
}

fixAutoIncrementFK2();
