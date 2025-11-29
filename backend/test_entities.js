const axios = require('axios');

async function testEntities() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'browser_test_authority@example.com',
            password: 'password123'
        });

        const token = loginRes.data.token;
        const headers = { 'Authorization': `Bearer ${token}` };

        console.log('Testing entities endpoint...');
        const res = await axios.get('http://localhost:5000/api/authority/entities?limit=5', { headers });
        console.log('✅ Entities OK:', res.data?.data?.length, 'entities');
        console.log('Sample:', JSON.stringify(res.data?.data?.[0], null, 2));
        process.exit(0);
    } catch (error) {
        console.error('❌ Entities ERROR:', error.response?.data || error.message);
        console.error('Status:', error.response?.status);
        process.exit(1);
    }
}

testEntities();
