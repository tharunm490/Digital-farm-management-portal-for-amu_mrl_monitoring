const axios = require('axios');
const db = require('./config/database');

async function testQRCodeWorkflow() {
    try {
        console.log('=== Testing QR Code Generation and Verification ===\n');

        // 1. Login as Farmer
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'browser_test_farmer@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('✓ Logged in as farmer');

        // 2. Get farmer's batches
        const [batches] = await db.query(`
      SELECT b.* FROM batches b
      JOIN farms f ON b.farm_id = f.farm_id
      JOIN farmers fa ON f.farmer_id = fa.farmer_id
      JOIN users u ON fa.user_id = u.user_id
      WHERE u.email = 'browser_test_farmer@example.com'
      LIMIT 1
    `);

        if (batches.length === 0) {
            console.log('✗ No batches found for farmer');
            return;
        }

        const batch = batches[0];
        console.log(`✓ Found batch: ${batch.batch_id} - ${batch.batch_name}`);

        // 3. Generate QR Code
        const qrRes = await axios.post(
            `http://localhost:5000/api/qr/generate/${batch.batch_id}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log(`✓ QR Code generated: ${qrRes.data.qr_hash.substring(0, 20)}...`);
        const qrHash = qrRes.data.qr_hash;

        // 4. Verify QR Code (public endpoint, no auth needed)
        const verifyRes = await axios.get(`http://localhost:5000/api/verify/hash/${qrHash}`);

        console.log('\n=== QR Verification Result ===');
        console.log(`Batch: ${verifyRes.data.batch_name}`);
        console.log(`Species: ${verifyRes.data.species}`);
        console.log(`Farm: ${verifyRes.data.farm_name}`);
        console.log(`Status: ${verifyRes.data.status}`);
        console.log(`Treatments: ${verifyRes.data.treatment_count || 0}`);

        if (verifyRes.data.safe_date) {
            console.log(`Safe Date: ${verifyRes.data.safe_date}`);
        }

        console.log('\n✅ QR Code workflow test PASSED');
        process.exit(0);

    } catch (error) {
        console.error('\n✗ Error:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

testQRCodeWorkflow();
