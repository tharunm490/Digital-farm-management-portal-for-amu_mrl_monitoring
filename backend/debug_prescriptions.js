const axios = require('axios');

async function debugPrescriptions() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'browser_test_authority@example.com',
            password: 'password123'
        });

        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        console.log('Testing prescriptions endpoint...\n');

        try {
            const res = await axios.get('http://localhost:5000/api/prescriptions', { headers });
            console.log('✅ Success!');
            console.log('Data:', JSON.stringify(res.data, null, 2));
        } catch (e) {
            console.log('❌ Error details:');
            console.log('Status:', e.response?.status);
            console.log('Data:', JSON.stringify(e.response?.data, null, 2));
            console.log('Message:', e.message);
        }

        process.exit(0);
    } catch (error) {
        console.error('Fatal:', error.message);
        process.exit(1);
    }
}

debugPrescriptions();
