const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'SIH'
    });

    try {
        console.log('=== Farmers in Database ===\n');
        const [farmers] = await connection.query(`
      SELECT u.email, u.display_name, f.farmer_id
      FROM users u
      JOIN farmers f ON u.user_id = f.user_id
      WHERE u.role = 'farmer'
      LIMIT 5
    `);

        console.log(`Found ${farmers.length} farmer(s):`);
        farmers.forEach((f, i) => {
            console.log(`${i + 1}. ${f.display_name || 'N/A'} - ${f.email}`);
        });

        if (farmers.length > 0) {
            console.log(`\n📧 Use this email to login: ${farmers[0].email}`);
            console.log(`🔑 Password: (whatever you set during registration)`);
        }

        await connection.end();
    } catch (err) {
        console.error('Error:', err.message);
        await connection.end();
    }
})();
