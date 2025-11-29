const axios = require('axios');

async function verifyAuthority() {
    try {
        // 1. Login
        console.log('Logging in as Authority...');
        const loginRes = await axios.post('http://127.0.0.1:5000/api/auth/login', {
            email: 'testauthority_final@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Authority Logged In.');

        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Dashboard Stats
        console.log('Fetching Dashboard Stats...');
        const statsRes = await axios.get('http://127.0.0.1:5000/api/authority/dashboard-stats', config);
        console.log('Stats:', JSON.stringify(statsRes.data.data, null, 2));

        // 3. Trends
        console.log('Fetching Trends...');
        const trendsRes = await axios.get('http://127.0.0.1:5000/api/authority/trends', config);
        console.log('Trends Count:', trendsRes.data.data.length);

        // 4. Geo Analytics
        console.log('Fetching Geo Analytics...');
        const geoRes = await axios.get('http://127.0.0.1:5000/api/analytics/geo?level=state', config);
        console.log('Geo Data Count:', geoRes.data.data.length);

    } catch (error) {
        console.error('Verification Failed:', error.response ? error.response.data : error.message);
    }
}

verifyAuthority();
