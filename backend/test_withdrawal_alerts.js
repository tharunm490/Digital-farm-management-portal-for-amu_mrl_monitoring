const axios = require('axios');
const db = require('./config/database');

async function testWithdrawalAlerts() {
    try {
        console.log('=== Testing Withdrawal Alerts ===\n');

        // 1. Login as Farmer
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'browser_test_farmer@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('✓ Logged in as farmer');

        // 2. Get active withdrawals
        const withdrawalsRes = await axios.get(
            'http://localhost:5000/api/treatments/withdrawals/active',
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log(`\n✓ Found ${withdrawalsRes.data.length} active withdrawals`);

        if (withdrawalsRes.data.length > 0) {
            console.log('\n=== Sample Withdrawal ===');
            const sample = withdrawalsRes.data[0];
            console.log(`Entity: ${sample.tag_id || sample.batch_name}`);
            console.log(`Medicine: ${sample.medicine}`);
            console.log(`Safe Date: ${sample.safe_date}`);
            console.log(`Days Until Safe: ${sample.days_until_safe}`);
        }

        console.log('\n✅ Withdrawal alerts test PASSED');
        process.exit(0);

    } catch (error) {
        console.error('\n✗ Error:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

testWithdrawalAlerts();
