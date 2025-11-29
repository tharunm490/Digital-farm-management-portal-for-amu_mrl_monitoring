const axios = require('axios');

async function verifyAnalytics() {
    try {
        // 1. Login as Authority
        console.log('Logging in as Authority...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'testauthority_final@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Authority Logged In.');

        // 2. Fetch Dashboard Stats
        console.log('Fetching Dashboard Stats...');
        const statsRes = await axios.get('http://localhost:5000/api/authority/dashboard-stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Stats:', statsRes.data);

        // 3. Fetch Trends
        console.log('Fetching Trends...');
        const trendsRes = await axios.get('http://localhost:5000/api/authority/trends', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Trends Data:', trendsRes.data);

        // 4. Fetch Maps Data
        console.log('Fetching Maps Data...');
        const mapsRes = await axios.get('http://localhost:5000/api/authority/maps?level=state', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Maps Data:', mapsRes.data);

        // 5. Fetch High Risk Farms
        console.log('Fetching High Risk Farms...');
        const riskRes = await axios.get('http://localhost:5000/api/authority/high-risk-farms', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('High Risk Farms:', riskRes.data);

    } catch (error) {
        console.error('Verification Failed:', error.response ? error.response.data : error.message);
        if (error.response && error.response.status === 404) {
            console.error('Endpoint not found. Check URL.');
        }
    }
}

verifyAnalytics();
