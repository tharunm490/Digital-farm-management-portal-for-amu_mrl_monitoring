const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let token = '';
let farmId = '';
let animalId = '';

async function login() {
    try {
        console.log('Logging in...');
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            email: "testfarmer@example.com",
            password: "password123"
        });
        token = res.data.token;
        console.log('Login successful. Token received.');
        return true;
    } catch (err) {
        console.error('Login failed:', err.response ? err.response.data : err.message);
        return false;
    }
}

async function addFarm() {
    try {
        console.log('Adding Farm...');
        const res = await axios.post(`${BASE_URL}/farms`, {
            farm_name: `Test Farm ${Date.now()}`,
            farm_type: "Dairy",
            location: "Bangalore",
            size: 10
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        farmId = res.data.farm_id || res.data.insertId; // Adjust based on actual response
        console.log('Farm added:', res.data);
        return true;
    } catch (err) {
        console.error('Add Farm failed:', err.response ? err.response.data : err.message);
        return false;
    }
}

async function addAnimal() {
    try {
        console.log('Adding Animal...');
        // First get the farm ID if not returned directly (might need to fetch farms)
        if (!farmId) {
            const farmsRes = await axios.get(`${BASE_URL}/farms`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (farmsRes.data.length > 0) {
                farmId = farmsRes.data[0].farm_id;
            } else {
                console.error('No farms found to add animal to.');
                return false;
            }
        }

        const res = await axios.post(`${BASE_URL}/entities`, {
            farm_id: farmId,
            tag_id: "COW-001",
            species: "Cattle",
            breed: "Jersey",
            age: 2,
            weight: 300,
            gender: "Female",
            matrix: "Milk",
            entity_type: "animal"
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        animalId = res.data.entity ? res.data.entity.entity_id : (res.data.entity_id || res.data.insertId);
        console.log('Animal added:', res.data);
        return true;
    } catch (err) {
        console.error('Add Animal failed:', err.response ? err.response.data : err.message);
        return false;
    }
}

async function requestTreatment() {
    try {
        console.log('Requesting Treatment...');
        // Need animal ID
        if (!animalId) {
            const animalsRes = await axios.get(`${BASE_URL}/entities?farm_id=${farmId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (animalsRes.data.length > 0) {
                animalId = animalsRes.data[0].entity_id;
            } else {
                console.error('No animals found to treat.');
                return false;
            }
        }

        const res = await axios.post(`${BASE_URL}/treatment-requests`, {
            entity_id: animalId,
            symptoms: "Fever, lethargy",
            priority: "High",
            description: "Cow looks sick"
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Treatment requested:', res.data);
        return true;
    } catch (err) {
        console.error('Request Treatment failed:', err.response ? err.response.data : err.message);
        return false;
    }
}

async function run() {
    if (await login()) {
        await addFarm();
        await addAnimal();
        await requestTreatment();
    }
}

run();
