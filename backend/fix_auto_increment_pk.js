const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function fixAutoIncrementPK() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Fixing vet_id Auto Increment (PK Handling) ---');

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

        // 3. Modify column - Ensure it's PRIMARY KEY
        console.log('Modifying vet_id to AUTO_INCREMENT PRIMARY KEY...');
        // Note: If it's already PK, we just need to add AUTO_INCREMENT. 
        // If we re-declare PRIMARY KEY it might error if it already exists.
        // Safer to just modify column to AUTO_INCREMENT, assuming it IS a key.
        // If it failed before, maybe it wasn't a key?
        // Let's check if it's a key first.
        const [keys] = await connection.query("SHOW KEYS FROM veterinarians WHERE Key_name = 'PRIMARY'");
        if (keys.length === 0) {
            console.log('Adding PRIMARY KEY...');
            await connection.query('ALTER TABLE veterinarians ADD PRIMARY KEY (vet_id)');
        }

        await connection.query('ALTER TABLE veterinarians MODIFY COLUMN vet_id INT AUTO_INCREMENT');
        console.log('vet_id modified to AUTO_INCREMENT.');

        // 4. Re-add FKs
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
        console.error('Error fixing auto increment:', err);
    } finally {
        await connection.end();
    }
}

fixAutoIncrementPK();
