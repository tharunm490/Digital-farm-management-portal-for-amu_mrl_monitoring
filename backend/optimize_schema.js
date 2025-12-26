const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function optimizeSchema() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    try {
        console.log('--- Optimizing Database Schema ---');

        // 1. Create authority_users table
        console.log('Creating authority_users table...');
        await connection.query(`
      CREATE TABLE IF NOT EXISTS authority_users (
        authority_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        full_name VARCHAR(255),
        department VARCHAR(255),
        jurisdiction VARCHAR(255),
        badge_number VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);
        console.log('authority_users table created/verified.');

        // 2. Create vets table
        console.log('Creating vets table...');
        await connection.query(`
      CREATE TABLE IF NOT EXISTS vets (
        vet_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        full_name VARCHAR(255),
        license_number VARCHAR(100),
        specialization VARCHAR(255),
        clinic_address TEXT,
        phone_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);
        console.log('vets table created/verified.');

        // 3. Add vet_id to farms table
        console.log('Checking farms table for vet_id...');
        const [farmsCols] = await connection.query('DESCRIBE farms');
        const vetIdCol = farmsCols.find(c => c.Field === 'vet_id');

        if (!vetIdCol) {
            console.log('Adding vet_id column to farms table...');
            await connection.query(`
            ALTER TABLE farms
            ADD COLUMN vet_id INT,
            ADD CONSTRAINT fk_farms_vet
            FOREIGN KEY (vet_id) REFERENCES users(user_id) ON DELETE SET NULL
        `);
            console.log('vet_id column added to farms.');
        } else {
            console.log('vet_id column already exists in farms.');
        }

        console.log('--- Schema Optimization Complete ---');

    } catch (err) {
        console.error('Error optimizing schema:', err);
    } finally {
        await connection.end();
    }
}

optimizeSchema();
