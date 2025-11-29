const axios = require('axios');

async function testEntitiesEndpoint() {
    try {
        // 1. Login as farmer
        console.log('Logging in...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'yashasbrbtech24@rvu.edu.in', // Actual email from DB
            password: 'password123'
        });
        const token = loginResponse.data.token;
        console.log('Login successful, token obtained.');

        // 2. Fetch entities
        console.log('Fetching entities...');
        const entitiesResponse = await axios.get('http://localhost:5000/api/entities', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Entities fetched successfully:', entitiesResponse.data.length);

        // 3. Fetch farms (for comparison)
        console.log('Fetching farms...');
        const farmsResponse = await axios.get('http://localhost:5000/api/farms', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Farms fetched successfully:', farmsResponse.data.data ? farmsResponse.data.data.length : farmsResponse.data.length);

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        if (error.response && error.response.status === 404) {
            console.error('404 Not Found - Endpoint or Resource missing');
        }
    }
}

testEntitiesEndpoint();
