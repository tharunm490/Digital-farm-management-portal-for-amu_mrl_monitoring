const axios = require('axios');

async function testRegister() {
    try {
        const response = await axios.post('http://localhost:5000/api/auth/register', {
            full_name: 'Test Script Farmer',
            email: 'testscript_' + Date.now() + '@example.com',
            password: 'password123',
            role: 'farmer',
            phone: '1234567890',
            state: 'Karnataka',
            district: 'Mysuru',
            address: 'Test Address'
        });
        console.log('Registration Successful:', response.data);
    } catch (error) {
        console.error('Registration Failed:', error.response ? error.response.data : error.message);
    }
}

testRegister();
