const axios = require('axios');

(async () => {
    try {
        console.log('Testing the EXACT endpoint the frontend calls...\n');

        // Get a farm ID first
        const mysql = require('mysql2/promise');
        require('dotenv').config();

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'SIH'
        });

        const [farms] = await connection.query('SELECT farm_id, farm_name FROM farms LIMIT 1');
        await connection.end();

        if (farms.length === 0) {
            console.log('No farms found');
            return;
        }

        const farmId = farms[0].farm_id;
        console.log(`Testing with farm: ${farms[0].farm_name} (ID: ${farmId})\n`);

        // Test the EXACT endpoint the frontend calls
        const url = `http://localhost:5000/api/vet-farm-mapping/farm/${farmId}`;
        console.log(`Calling: ${url}`);

        const response = await axios.get(url);
        console.log('\n✅ API Response:');
        console.log(JSON.stringify(response.data, null, 2));

        if (response.data.hasVet) {
            console.log('\n🎉 SUCCESS! Vet is assigned!');
            console.log(`Vet: ${response.data.vet.vet_name}`);
            console.log('\nThe warning should now be GONE. Refresh your browser!');
        } else {
            console.log('\n❌ Still no vet assigned');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.response) {
            console.error('Response:', err.response.data);
        }
    }
})();
