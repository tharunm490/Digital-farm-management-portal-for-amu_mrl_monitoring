const axios = require('axios');

async function comprehensiveAuthorityTest() {
    try {
        console.log('=== AUTHORITY DASHBOARD COMPREHENSIVE TEST ===\n');

        // Login
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'browser_test_authority@example.com',
            password: 'password123'
        });

        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        console.log('✅ Logged in as authority\n');

        const results = {
            passed: [],
            failed: []
        };

        // Test 1: Farms
        console.log('1. Testing /api/farms...');
        try {
            const res = await axios.get('http://localhost:5000/api/farms', { headers });
            console.log(`   ✅ PASS - ${res.data.data?.length || 0} farms found`);
            results.passed.push('Farms');
        } catch (e) {
            console.log(`   ❌ FAIL - ${e.response?.data?.message || e.message}`);
            results.failed.push({ endpoint: 'Farms', error: e.response?.data || e.message });
        }

        // Test 2: Prescriptions
        console.log('2. Testing /api/prescriptions...');
        try {
            const res = await axios.get('http://localhost:5000/api/prescriptions', { headers });
            console.log(`   ✅ PASS - ${res.data.data?.length || res.data.length || 0} prescriptions found`);
            results.passed.push('Prescriptions');
        } catch (e) {
            console.log(`   ❌ FAIL - ${e.response?.data?.message || e.message}`);
            results.failed.push({ endpoint: 'Prescriptions', error: e.response?.data || e.message });
        }

        // Test 3: Dashboard Stats
        console.log('3. Testing /api/authority/dashboard-stats...');
        try {
            const res = await axios.get('http://localhost:5000/api/authority/dashboard-stats', { headers });
            console.log(`   ✅ PASS - Stats: ${JSON.stringify(res.data.data)}`);
            results.passed.push('Dashboard Stats');
        } catch (e) {
            console.log(`   ❌ FAIL - ${e.response?.data?.message || e.message}`);
            results.failed.push({ endpoint: 'Dashboard Stats', error: e.response?.data || e.message });
        }

        // Test 4: Trends
        console.log('4. Testing /api/authority/trends...');
        try {
            const res = await axios.get('http://localhost:5000/api/authority/trends', { headers });
            console.log(`   ✅ PASS - ${res.data.data?.length || 0} trend data points`);
            results.passed.push('Trends');
        } catch (e) {
            console.log(`   ❌ FAIL - ${e.response?.data?.message || e.message}`);
            results.failed.push({ endpoint: 'Trends', error: e.response?.data || e.message });
        }

        // Test 5: Maps
        console.log('5. Testing /api/authority/maps...');
        try {
            const res = await axios.get('http://localhost:5000/api/authority/maps', { headers });
            console.log(`   ✅ PASS - ${res.data.data?.length || 0} regions`);
            results.passed.push('Maps');
        } catch (e) {
            console.log(`   ❌ FAIL - ${e.response?.data?.message || e.message}`);
            results.failed.push({ endpoint: 'Maps', error: e.response?.data || e.message });
        }

        // Test 6: High-Risk Farms
        console.log('6. Testing /api/authority/high-risk-farms...');
        try {
            const res = await axios.get('http://localhost:5000/api/authority/high-risk-farms', { headers });
            console.log(`   ✅ PASS - ${res.data.data?.length || 0} high-risk farms`);
            results.passed.push('High-Risk Farms');
        } catch (e) {
            console.log(`   ❌ FAIL - ${e.response?.data?.message || e.message}`);
            results.failed.push({ endpoint: 'High-Risk Farms', error: e.response?.data || e.message });
        }

        // Test 7: Audit Trail
        console.log('7. Testing /api/authority/audit-trail...');
        try {
            const res = await axios.get('http://localhost:5000/api/authority/audit-trail', { headers });
            console.log(`   ✅ PASS - ${res.data.data?.length || 0} audit entries`);
            results.passed.push('Audit Trail');
        } catch (e) {
            console.log(`   ❌ FAIL - ${e.response?.data?.message || e.message}`);
            results.failed.push({ endpoint: 'Audit Trail', error: e.response?.data || e.message });
        }

        // Test 8: Entities
        console.log('8. Testing /api/authority/entities...');
        try {
            const res = await axios.get('http://localhost:5000/api/authority/entities', { headers });
            console.log(`   ✅ PASS - ${res.data.data?.length || 0} entities`);
            results.passed.push('Entities');
        } catch (e) {
            console.log(`   ❌ FAIL - ${e.response?.data?.message || e.message}`);
            results.failed.push({ endpoint: 'Entities', error: e.response?.data || e.message });
        }

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Passed: ${results.passed.length}/${results.passed.length + results.failed.length}`);
        console.log(`❌ Failed: ${results.failed.length}/${results.passed.length + results.failed.length}`);

        if (results.passed.length > 0) {
            console.log('\n✅ Passing endpoints:', results.passed.join(', '));
        }

        if (results.failed.length > 0) {
            console.log('\n❌ Failing endpoints:');
            results.failed.forEach(f => {
                console.log(`   - ${f.endpoint}: ${JSON.stringify(f.error)}`);
            });
        }

        process.exit(results.failed.length > 0 ? 1 : 0);

    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    }
}

comprehensiveAuthorityTest();
