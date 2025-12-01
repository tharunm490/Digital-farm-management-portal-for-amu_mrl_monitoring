const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function fixAutoIncrementFKFinal() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Fixing vet_id Auto Increment (Dynamic FK Handling) ---');

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

        // 3. Modify column
        console.log('Modifying vet_id to AUTO_INCREMENT...');
        await connection.query('ALTER TABLE veterinarians MODIFY COLUMN vet_id INT AUTO_INCREMENT');
        console.log('vet_id modified to AUTO_INCREMENT.');

        // 4. Re-add FKs
        for (const fk of fks) {
            console.log(`Re-adding FK ${fk.CONSTRAINT_NAME} to ${fk.TABLE_NAME}`);
            // Assuming ON DELETE SET NULL for farms, CASCADE for others as a safe default or based on table name
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

fixAutoIncrementFKFinal();
