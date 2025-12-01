const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let token = '';

async function login() {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
        email: "testauthority@example.com",
        password: "password123"
    });
    token = res.data.token;
    console.log('Logged in as Authority\n');
}

async function testEndpoint(name, url) {
    try {
        console.log(`Testing ${name}...`);
        const res = await axios.get(`${BASE_URL}${url}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ ${name} - Success`);
        console.log('Response:', JSON.stringify(res.data, null, 2).substring(0, 500));
        return true;
    } catch (err) {
        console.log(`❌ ${name} - Failed`);
        if (err.response) {
            console.log('Status:', err.response.status);
            console.log('Error:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.log('Error:', err.message);
        }
        return false;
    }
}

async function run() {
    await login();

    console.log('='.repeat(60));
    console.log('TESTING FAILED ENDPOINTS');
    console.log('='.repeat(60) + '\n');

    await testEndpoint('Entities', '/authority/entities?page=1&limit=5');
    console.log('\n' + '-'.repeat(60) + '\n');

    await testEndpoint('AMU Trends', '/analytics/amu-trends?interval=monthly');
    console.log('\n' + '-'.repeat(60) + '\n');

    await testEndpoint('District Heatmap', '/analytics/district-heatmap');
    console.log('\n' + '-'.repeat(60) + '\n');

    await testEndpoint('Species Breakdown', '/analytics/species-breakdown');
    console.log('\n' + '-'.repeat(60) + '\n');

    await testEndpoint('Risk Farms', '/analytics/risk-farms?min_risk_score=0&limit=10');
}

run();
