const axios = require('axios');

async function createAndTestUser() {
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'password123';

    try {
        // 1. Register new user
        console.log(`Registering user: ${testEmail}`);
        const registerResponse = await axios.post('http://localhost:5000/api/auth/register', {
            email: testEmail,
            password: testPassword,
            full_name: 'Test Farmer',
            role: 'farmer',
            phone: '1234567890',
            address: 'Test Address',
            state: 'Test State',
            district: 'Test District'
        });
        const token = registerResponse.data.token;
        console.log('Registration successful, token obtained.');

        // 2. Fetch entities (should be empty but 200 OK)
        console.log('Fetching entities...');
        const entitiesResponse = await axios.get('http://localhost:5000/api/entities', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Entities fetched successfully:', entitiesResponse.data);

        // 3. Create an entity
        console.log('Creating entity...');
        // First need a farm
        const farmResponse = await axios.post('http://localhost:5000/api/farms', {
            farm_name: 'Test Farm',
            latitude: 12.34,
            longitude: 56.78
        }, { headers: { Authorization: `Bearer ${token}` } });
        const farmId = farmResponse.data.id;

        const createEntityResponse = await axios.post('http://localhost:5000/api/entities', {
            farm_id: farmId,
            entity_type: 'animal',
            species: 'cattle',
            tag_id: `TAG-${Date.now()}`,
            matrix: 'milk'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('Entity created:', createEntityResponse.data);

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

createAndTestUser();
