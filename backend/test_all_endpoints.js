const axios = require('axios');

async function comprehensiveTest() {
    try {
        console.log('=== COMPREHENSIVE AUTHORITY DASHBOARD TEST ===\n');

        // Login
        console.log('1. Logging in as authority user...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'browser_test_authority@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        const headers = { 'Authorization': `Bearer ${token}` };
        console.log('   ✅ Login successful\n');

        // Test all endpoints
        console.log('2. Testing /api/farms...');
        const farmsRes = await axios.get('http://localhost:5000/api/farms', { headers });
        console.log(`   ✅ Farms: ${farmsRes.data?.data?.length || 0} farms`);

        console.log('\n3. Testing /api/authority/dashboard-stats...');
        const statsRes = await axios.get('http://localhost:5000/api/authority/dashboard-stats', { headers });
        console.log('   ✅ Stats:', JSON.stringify(statsRes.data?.data, null, 2));

        console.log('\n4. Testing /api/authority/trends...');
        const trendsRes = await axios.get('http://localhost:5000/api/authority/trends', { headers });
        console.log(`   ✅ Trends: ${trendsRes.data?.data?.length || 0} data points`);

        console.log('\n5. Testing /api/authority/maps...');
        const mapsRes = await axios.get('http://localhost:5000/api/authority/maps', { headers });
        console.log(`   ✅ Maps: ${mapsRes.data?.data?.length || 0} regions`);
        console.log('   Sample:', JSON.stringify(mapsRes.data?.data?.[0], null, 2));

        console.log('\n6. Testing /api/authority/entities...');
        const entitiesRes = await axios.get('http://localhost:5000/api/authority/entities?limit=5', { headers });
        console.log(`   ✅ Entities: ${entitiesRes.data?.data?.length || 0} entities`);

        console.log('\n7. Testing /api/authority/audit-trail...');
        const auditRes = await axios.get('http://localhost:5000/api/authority/audit-trail', { headers });
        console.log(`   ✅ Audit Trail: ${auditRes.data?.data?.length || 0} entries`);

        console.log('\n✅ ALL ENDPOINTS WORKING!\n');
        console.log('Summary:');
        console.log(`  - Farms: ${farmsRes.data?.data?.length || 0}`);
        console.log(`  - Trends: ${trendsRes.data?.data?.length || 0}`);
        console.log(`  - Maps: ${mapsRes.data?.data?.length || 0}`);
        console.log(`  - Entities: ${entitiesRes.data?.data?.length || 0}`);
        console.log(`  - Audit: ${auditRes.data?.data?.length || 0}`);

        process.exit(0);
    } catch (error) {
        console.error('\n❌ ERROR:', error.response?.data || error.message);
        console.error('Status:', error.response?.status);
        console.error('Endpoint:', error.config?.url);
        process.exit(1);
    }
}

comprehensiveTest();
