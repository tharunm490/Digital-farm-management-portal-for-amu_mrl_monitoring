const axios = require('axios');

async function testAuthorityLogin() {
    try {
        console.log('=== Testing Authority User ===\n');

        // Try to login with authority user
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'browser_test_authority@example.com',
            password: 'password123'
        });

        console.log('✅ Authority login successful!');
        console.log('User:', loginRes.data.user.display_name);
        console.log('Role:', loginRes.data.user.role);

        const token = loginRes.data.token;

        // Test dashboard stats endpoint
        console.log('\n=== Testing Dashboard Stats ===');
        const statsRes = await axios.get(
            'http://localhost:5000/api/authority/dashboard-stats',
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('Stats:', JSON.stringify(statsRes.data, null, 2));

        // Test farms access
        console.log('\n=== Testing Farms Access ===');
        const farmsRes = await axios.get(
            'http://localhost:5000/api/farms',
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log(`Total farms accessible: ${farmsRes.data.length || 0}`);

        // Test audit trail
        console.log('\n=== Testing Audit Trail ===');
        const auditRes = await axios.get(
            'http://localhost:5000/api/authority/audit-trail',
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log(`Audit entries: ${auditRes.data.length || 0}`);

        console.log('\n✅ All authority endpoints working!');
        process.exit(0);

    } catch (error) {
        if (error.response?.status === 404 && error.response?.data?.error === 'No user with that email') {
            console.log('❌ Authority user does not exist');
            console.log('\nNeed to create authority user first.');
        } else {
            console.error('❌ Error:', error.response?.data || error.message);
        }
        process.exit(1);
    }
}

testAuthorityLogin();
