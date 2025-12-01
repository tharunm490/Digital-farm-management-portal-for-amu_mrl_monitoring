const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const tokens = {
    farmer: '',
    vet: '',
    authority: ''
};

// Login functions
async function loginFarmer() {
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            email: "testfarmer@example.com",
            password: "password123"
        });
        tokens.farmer = res.data.token;
        console.log('✅ Farmer login successful');
        return true;
    } catch (err) {
        console.log('❌ Farmer login failed:', err.response?.data?.message || err.message);
        return false;
    }
}

async function loginVet() {
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            email: "testvet@example.com",
            password: "password123"
        });
        tokens.vet = res.data.token;
        console.log('✅ Vet login successful');
        return true;
    } catch (err) {
        console.log('❌ Vet login failed:', err.response?.data?.message || err.message);
        return false;
    }
}

async function loginAuthority() {
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            email: "testauthority@example.com",
            password: "password123"
        });
        tokens.authority = res.data.token;
        console.log('✅ Authority login successful');
        return true;
    } catch (err) {
        console.log('❌ Authority login failed:', err.response?.data?.message || err.message);
        return false;
    }
}

// Test functions
async function testEndpoint(name, url, token, role) {
    try {
        const res = await axios.get(`${BASE_URL}${url}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`  ✅ ${name}`);
        return { name, status: 'pass', data: res.data };
    } catch (err) {
        console.log(`  ❌ ${name}: ${err.response?.status || 'ERROR'} - ${err.response?.data?.message || err.message}`);
        return { name, status: 'fail', error: err.response?.data || err.message };
    }
}

async function runComprehensiveTests() {
    console.log('\n' + '='.repeat(70));
    console.log('COMPREHENSIVE SYSTEM TESTING');
    console.log('='.repeat(70) + '\n');

    // Login all users
    console.log('📝 AUTHENTICATION\n');
    const farmerAuth = await loginFarmer();
    const vetAuth = await loginVet();
    const authorityAuth = await loginAuthority();

    const results = {
        farmer: [],
        vet: [],
        authority: []
    };

    // FARMER DASHBOARD TESTS
    if (farmerAuth) {
        console.log('\n🌾 FARMER DASHBOARD\n');
        results.farmer.push(await testEndpoint('Get Farms', '/farms', tokens.farmer, 'farmer'));
        results.farmer.push(await testEndpoint('Get Animals', '/entities', tokens.farmer, 'farmer'));
        results.farmer.push(await testEndpoint('Get Treatment Requests', '/treatment-requests', tokens.farmer, 'farmer'));
        results.farmer.push(await testEndpoint('Get AMU Records', '/amu', tokens.farmer, 'farmer'));
    }

    // VETERINARIAN DASHBOARD TESTS
    if (vetAuth) {
        console.log('\n🏥 VETERINARIAN DASHBOARD\n');
        results.vet.push(await testEndpoint('Get Assigned Farms', '/farms', tokens.vet, 'vet'));
        results.vet.push(await testEndpoint('Get Treatment Requests', '/treatment-requests', tokens.vet, 'vet'));
        results.vet.push(await testEndpoint('Get Prescriptions', '/prescriptions', tokens.vet, 'vet'));
    }

    // AUTHORITY DASHBOARD TESTS
    if (authorityAuth) {
        console.log('\n👔 AUTHORITY DASHBOARD\n');

        console.log('  Core Endpoints:');
        results.authority.push(await testEndpoint('Dashboard Stats', '/authority/dashboard-stats', tokens.authority, 'authority'));
        results.authority.push(await testEndpoint('Trends', '/authority/trends', tokens.authority, 'authority'));
        results.authority.push(await testEndpoint('Maps', '/authority/maps?level=district', tokens.authority, 'authority'));
        results.authority.push(await testEndpoint('Drug Classes', '/authority/drug-classes', tokens.authority, 'authority'));
        results.authority.push(await testEndpoint('Entities', '/authority/entities?page=1&limit=5', tokens.authority, 'authority'));

        console.log('\n  Analytics Endpoints:');
        results.authority.push(await testEndpoint('AMU Trends', '/analytics/amu-trends', tokens.authority, 'authority'));
        results.authority.push(await testEndpoint('District Heatmap', '/analytics/district-heatmap', tokens.authority, 'authority'));
        results.authority.push(await testEndpoint('Species Breakdown', '/analytics/species-breakdown', tokens.authority, 'authority'));
        results.authority.push(await testEndpoint('Risk Farms', '/analytics/risk-farms?min_risk_score=0', tokens.authority, 'authority'));
    }

    // SUMMARY
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));

    const farmerPass = results.farmer.filter(r => r.status === 'pass').length;
    const farmerFail = results.farmer.filter(r => r.status === 'fail').length;
    const vetPass = results.vet.filter(r => r.status === 'pass').length;
    const vetFail = results.vet.filter(r => r.status === 'fail').length;
    const authorityPass = results.authority.filter(r => r.status === 'pass').length;
    const authorityFail = results.authority.filter(r => r.status === 'fail').length;

    console.log(`\n🌾 FARMER: ${farmerPass} passed, ${farmerFail} failed (${results.farmer.length} total)`);
    console.log(`🏥 VET: ${vetPass} passed, ${vetFail} failed (${results.vet.length} total)`);
    console.log(`👔 AUTHORITY: ${authorityPass} passed, ${authorityFail} failed (${results.authority.length} total)`);

    const totalPass = farmerPass + vetPass + authorityPass;
    const totalFail = farmerFail + vetFail + authorityFail;
    const total = totalPass + totalFail;

    console.log(`\n📊 OVERALL: ${totalPass}/${total} tests passed (${Math.round(totalPass / total * 100)}%)`);
    console.log('='.repeat(70) + '\n');

    return results;
}

runComprehensiveTests();
