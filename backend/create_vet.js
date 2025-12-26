const axios = require('axios');

const vetData = {
    full_name: "Dr. Test Vet",
    email: "testvet@example.com",
    password: "password123",
    role: "veterinarian",
    phone: "9876543210",
    state: "Karnataka",
    district: "Bangalore Urban",
    license_number: "VET-12345"
};

async function registerVet() {
    try {
        const response = await axios.post('http://localhost:5000/api/auth/register', vetData);
        console.log('Vet Registration successful:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Vet Registration failed:', error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

registerVet();
