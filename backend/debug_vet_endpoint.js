const axios = require('axios');
const fs = require('fs');

async function debugVetEndpoint() {
    const email = 'browser_test_vet@example.com';
    const password = 'password123';

    try {
        // Login
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email,
            password
        });
        const token = loginResponse.data.token;
        console.log('Logged in as Vet.');

        const headers = { Authorization: `Bearer ${token}` };

        // Call endpoint
        console.log('Calling /api/vet-treatments/assigned-farms/withdrawals...');
        try {
            const response = await axios.get('http://localhost:5000/api/vet-treatments/assigned-farms/withdrawals', { headers });
            console.log('Response Data:', JSON.stringify(response.data, null, 2));
        } catch (err) {
            const errorData = err.response ? err.response.data : { message: err.message };
            fs.writeFileSync('vet_debug_error.json', JSON.stringify(errorData, null, 2));
            console.error('Endpoint Failed. Check vet_debug_error.json');
        }

    } catch (error) {
        console.error('Login Failed:', error.response ? error.response.data : error.message);
    }
}

debugVetEndpoint();
