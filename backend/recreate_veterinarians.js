const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function recreateVeterinarians() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Recreating Veterinarians Table ---');

        // 1. Find all FKs referencing veterinarians
        const [fks] = await connection.query(`
        SELECT TABLE_NAME, CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_NAME = 'veterinarians' 
        AND REFERENCED_COLUMN_NAME = 'vet_id' 
        AND TABLE_SCHEMA = 'SIH'
    `);

        console.log('Found FKs:', fks);

        // 2. Drop all FKs
        for (const fk of fks) {
            console.log(`Dropping FK ${fk.CONSTRAINT_NAME} from ${fk.TABLE_NAME}`);
            await connection.query(`ALTER TABLE ${fk.TABLE_NAME} DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
        }

        // 3. Drop veterinarians table
        console.log('Dropping veterinarians table...');
        await connection.query('DROP TABLE IF EXISTS veterinarians');

        // 4. Create veterinarians table with correct schema
        console.log('Creating veterinarians table...');
        await connection.query(`
      CREATE TABLE veterinarians (
        vet_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        vet_name VARCHAR(255),
        license_number VARCHAR(100),
        phone VARCHAR(20),
        state VARCHAR(100),
        district VARCHAR(100),
        taluk VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);
        console.log('veterinarians table created.');

        // 5. Re-add FKs
        for (const fk of fks) {
            console.log(`Re-adding FK ${fk.CONSTRAINT_NAME} to ${fk.TABLE_NAME}`);
            let onDelete = 'SET NULL';
            if (fk.TABLE_NAME === 'vet_farm_mapping') onDelete = 'CASCADE';

            try {
                await connection.query(`
                ALTER TABLE ${fk.TABLE_NAME} 
                ADD CONSTRAINT ${fk.CONSTRAINT_NAME} 
                FOREIGN KEY (vet_id) REFERENCES veterinarians(vet_id) ON DELETE ${onDelete}
            `);
            } catch (e) {
                console.error(`Failed to re-add FK ${fk.CONSTRAINT_NAME}:`, e.message);
            }
        }

    } catch (err) {
        console.error('Error recreating table:', err);
    } finally {
        await connection.end();
    }
}

recreateVeterinarians();
