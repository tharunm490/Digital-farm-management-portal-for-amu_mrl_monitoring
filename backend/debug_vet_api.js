const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    try {
        console.log('=== DEBUGGING VET ASSIGNMENT ISSUE ===\n');

        // Step 1: Check database
        console.log('1. Checking database...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'SIH'
        });

        const [mappings] = await connection.query(`
      SELECT vfm.*, v.vet_name, f.farm_name
      FROM vet_farm_mapping vfm
      JOIN veterinarians v ON vfm.vet_id = v.vet_id
      JOIN farms f ON vfm.farm_id = f.farm_id
      LIMIT 3
    `);
        console.log(`✓ Found ${mappings.length} vet-farm mappings in database`);
        if (mappings.length > 0) {
            console.log(`  Example: ${mappings[0].vet_name} → ${mappings[0].farm_name}`);
        }

        await connection.end();

        // Step 2: Test API endpoint
        console.log('\n2. Testing API endpoint...');
        const testFarmId = mappings.length > 0 ? mappings[0].farm_id : 1;
        const url = `http://localhost:5000/api/vet-farm-mapping/farm/${testFarmId}`;
        console.log(`   URL: ${url}`);

        try {
            const response = await axios.get(url);
            console.log('✓ API Response:', JSON.stringify(response.data, null, 2));

            if (response.data.hasVet) {
                console.log('\n✅ API IS WORKING! Vet is assigned.');
            } else {
                console.log('\n❌ API returns hasVet: false');
            }
        } catch (apiError) {
            console.log('❌ API Error:', apiError.message);
            if (apiError.response) {
                console.log('   Status:', apiError.response.status);
                console.log('   Data:', apiError.response.data);
            }
        }

        // Step 3: Check if backend logs show the API call
        console.log('\n3. Check backend terminal for log: [VET-FARM-API]');
        console.log('   If you see the log, the route is working');
        console.log('   If not, the route is not loaded');

    } catch (err) {
        console.error('Error:', err.message);
    }
})();
