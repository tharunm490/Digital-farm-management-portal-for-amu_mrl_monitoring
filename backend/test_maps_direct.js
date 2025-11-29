const axios = require('axios');

async function testMapsEndpoint() {
    try {
        console.log('1. Logging in...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'browser_test_authority@example.com',
            password: 'password123'
        });

        const token = loginRes.data.token;
        const headers = { 'Authorization': `Bearer ${token}` };

        console.log('2. Testing maps endpoint...');
        const mapsRes = await axios.get('http://localhost:5000/api/authority/maps', { headers });
        console.log('Maps Response:', JSON.stringify(mapsRes.data, null, 2));

        console.log('\n3. Testing entities endpoint...');
        const entitiesRes = await axios.get('http://localhost:5000/api/authority/entities?limit=5', { headers });
        console.log('Entities Response:', JSON.stringify(entitiesRes.data, null, 2));

        console.log('\n4. Testing dashboard stats...');
        const statsRes = await axios.get('http://localhost:5000/api/authority/dashboard-stats', { headers });
        console.log('Stats Response:', JSON.stringify(statsRes.data, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error.response?.data || error.message);
        console.error('Status:', error.response?.status);
        process.exit(1);
    }
}

testMapsEndpoint();
