const axios = require('axios');

const userData = {
    full_name: "Test Farmer",
    email: "testfarmer@example.com",
    password: "password123",
    role: "farmer",
    phone: "1234567890",
    state: "Karnataka",
    district: "Bangalore Urban"
};

async function register() {
    try {
        const response = await axios.post('http://localhost:5000/api/auth/register', userData);
        console.log('Registration successful:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Registration failed:', error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

register();
