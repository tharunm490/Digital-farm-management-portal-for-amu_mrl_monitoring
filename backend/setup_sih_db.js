const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;
const fs = require('fs');
const path = require('path');

async function setupDB() {
    // Connect without database selected to create DB
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password
    });

    try {
        console.log('Checking if database SIH exists...');
        await connection.query('CREATE DATABASE IF NOT EXISTS SIH');
        console.log('Database SIH created or already exists.');

        // Switch to SIH
        await connection.changeUser({ database: 'SIH' });

        // Check if tables exist (simple check)
        const [tables] = await connection.query('SHOW TABLES');
        if (tables.length === 0) {
            console.log('Database SIH is empty. Importing sih_data.sql...');
            const sqlPath = path.join(__dirname, '../sih_data.sql');
            if (fs.existsSync(sqlPath)) {
                const sql = fs.readFileSync(sqlPath, 'utf8');
                // Split by semicolon to execute multiple statements
                // Note: This is a simple splitter and might fail on complex SQL with semicolons in strings
                // Ideally use a proper SQL runner or mysql command line
                const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
                for (const stmt of statements) {
                    try {
                        await connection.query(stmt);
                    } catch (err) {
                        console.warn('Error executing statement:', err.message);
                    }
                }
                console.log('Imported sih_data.sql');
            } else {
                console.warn('sih_data.sql not found in root directory.');
            }
        } else {
            console.log('Database SIH is not empty. Skipping import.');
        }

    } catch (err) {
        console.error('Error setting up database:', err);
    } finally {
        await connection.end();
    }
}

setupDB();
