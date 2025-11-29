const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function seedVet() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        const email = 'testvet@example.com';
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if user exists
        const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
        let userId;

        if (users.length > 0) {
            console.log('User already exists.');
            userId = users[0].user_id;
        } else {
            // Create user
            const [result] = await connection.execute(
                'INSERT INTO users (email, password_hash, role, auth_provider, display_name) VALUES (?, ?, ?, ?, ?)',
                [email, hashedPassword, 'veterinarian', 'local', 'Test Vet']
            );
            userId = result.insertId;
            console.log('Created user with ID:', userId);
        }

        // Check if vet profile exists
        const [vets] = await connection.execute('SELECT * FROM veterinarians WHERE user_id = ?', [userId]);

        if (vets.length === 0) {
            await connection.execute(
                'INSERT INTO veterinarians (user_id, vet_name, license_number, state, district) VALUES (?, ?, ?, ?, ?)',
                [userId, 'Test Vet', 'VET12345', 'Karnataka', 'Bangalore Urban']
            );
            console.log('Created veterinarian profile.');
        } else {
            console.log('Veterinarian profile already exists.');
        }

    } catch (error) {
        console.error('Error seeding vet:', error);
    } finally {
        if (connection) await connection.end();
    }
}

seedVet();
