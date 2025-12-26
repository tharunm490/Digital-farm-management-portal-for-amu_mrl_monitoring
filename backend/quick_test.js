const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let token = '';

async function login() {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
        email: "testauthority@example.com",
        password: "password123"
    });
    token = res.data.token;
}

async function testAll() {
    await login();

    const tests = [
        { name: 'Dashboard Stats', url: '/authority/dashboard-stats' },
        { name: 'Trends', url: '/authority/trends?period=monthly' },
        { name: 'Maps', url: '/authority/maps?level=district' },
        { name: 'Drug Classes', url: '/authority/drug-classes' },
        { name: 'Entities', url: '/authority/entities?page=1&limit=5' },
        { name: 'AMU Trends', url: '/analytics/amu-trends?interval=monthly' },
        { name: 'District Heatmap', url: '/analytics/district-heatmap' },
        { name: 'Species Breakdown', url: '/analytics/species-breakdown' },
        { name: 'Risk Farms', url: '/analytics/risk-farms?min_risk_score=0&limit=10' }
    ];

    for (const test of tests) {
        try {
            const res = await axios.get(`${BASE_URL}${test.url}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`✅ ${test.name}`);
        } catch (err) {
            console.log(`❌ ${test.name}: ${err.response ? err.response.status + ' - ' + JSON.stringify(err.response.data).substring(0, 100) : err.message}`);
        }
    }
}

testAll();
