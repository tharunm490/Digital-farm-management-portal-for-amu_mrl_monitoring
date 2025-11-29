const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function testLogin() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        const email = 'testvet@example.com';
        const password = 'password123';

        // 1. Find user
        const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            console.log('User not found.');
            return;
        }

        const user = users[0];
        console.log('User found:', user.email, user.role, user.password_hash);

        // 2. Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log('Password match:', isMatch);

        if (isMatch) {
            console.log('Login successful!');
        } else {
            console.log('Login failed: Password incorrect.');
        }

    } catch (error) {
        console.error('Error testing login:', error);
    } finally {
        if (connection) await connection.end();
    }
}

testLogin();
