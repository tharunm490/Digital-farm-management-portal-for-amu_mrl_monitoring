const axios = require('axios');

async function testDataFetching() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'browser_test_authority@example.com',
            password: 'password123'
        });

        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        console.log('=== TESTING DATA FETCHING ===\n');

        // Test farms
        console.log('1. Farms:');
        const farmsRes = await axios.get('http://localhost:5000/api/farms', { headers });
        console.log('   Count:', farmsRes.data?.data?.length || 0);
        console.log('   Sample:', farmsRes.data?.data?.[0]);

        // Test dashboard stats
        console.log('\n2. Dashboard Stats:');
        const statsRes = await axios.get('http://localhost:5000/api/authority/dashboard-stats', { headers });
        console.log('   Data:', JSON.stringify(statsRes.data?.data, null, 2));

        // Test trends
        console.log('\n3. Trends:');
        const trendsRes = await axios.get('http://localhost:5000/api/authority/trends', { headers });
        console.log('   Count:', trendsRes.data?.data?.length || 0);
        console.log('   Sample:', trendsRes.data?.data?.[0]);

        // Test maps
        console.log('\n4. Maps:');
        const mapsRes = await axios.get('http://localhost:5000/api/authority/maps', { headers });
        console.log('   Count:', mapsRes.data?.data?.length || 0);
        console.log('   Sample:', mapsRes.data?.data?.[0]);

        // Test entities
        console.log('\n5. Entities:');
        const entitiesRes = await axios.get('http://localhost:5000/api/authority/entities?limit=10', { headers });
        console.log('   Count:', entitiesRes.data?.data?.length || 0);
        console.log('   Sample:', entitiesRes.data?.data?.[0]);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        process.exit(1);
    }
}

testDataFetching();
