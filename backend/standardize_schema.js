const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function standardizeSchema() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Standardizing Veterinarians Table ---');

        // Check if veterinarians table exists
        const [tables] = await connection.query("SHOW TABLES LIKE 'veterinarians'");

        if (tables.length === 0) {
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
        } else {
            console.log('veterinarians table exists. Checking columns...');
            const [cols] = await connection.query('DESCRIBE veterinarians');
            const colNames = cols.map(c => c.Field);

            if (!colNames.includes('vet_name')) {
                console.log('Adding vet_name column...');
                await connection.query('ALTER TABLE veterinarians ADD COLUMN vet_name VARCHAR(255)');
            }
            if (!colNames.includes('license_number')) {
                console.log('Adding license_number column...');
                await connection.query('ALTER TABLE veterinarians ADD COLUMN license_number VARCHAR(100)');
            }
            // Add other columns if needed
            console.log('veterinarians table schema verified.');
        }

    } catch (err) {
        console.error('Error standardizing schema:', err);
    } finally {
        await connection.end();
    }
}

standardizeSchema();
