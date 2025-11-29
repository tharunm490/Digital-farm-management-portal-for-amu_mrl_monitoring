const axios = require('axios');

async function testAuthorityDashboard() {
    try {
        console.log('=== Testing Authority Dashboard ===\n');

        // 1. Login as Authority
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'browser_test_authority@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('✓ Logged in as authority');

        // 2. Get dashboard stats
        const statsRes = await axios.get(
            'http://localhost:5000/api/authority/dashboard-stats',
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('\n=== Dashboard Statistics ===');
        console.log(`Total Farms: ${statsRes.data.total_farms || 0}`);
        console.log(`Total Treatments: ${statsRes.data.total_treatments || 0}`);
        console.log(`Unsafe Treatments: ${statsRes.data.unsafe_treatments || 0}`);
        console.log(`Total Animals: ${statsRes.data.total_animals || 0}`);

        // 3. Get audit trail
        const auditRes = await axios.get(
            'http://localhost:5000/api/authority/audit-trail',
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log(`\n✓ Audit Trail Entries: ${auditRes.data.length || 0}`);

        // 4. Get all farms
        const farmsRes = await axios.get(
            'http://localhost:5000/api/farms',
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log(`✓ Total Farms Accessible: ${farmsRes.data.length || 0}`);

        console.log('\n✅ Authority dashboard test PASSED');
        process.exit(0);

    } catch (error) {
        console.error('\n✗ Error:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

testAuthorityDashboard();
