const axios = require('axios');

async function setupBrowserTestUser() {
    const email = 'browser_test_farmer@example.com';
    const password = 'password123';

    try {
        // 1. Register (or login if exists)
        console.log(`Setting up user: ${email}`);
        let token;
        try {
            const registerResponse = await axios.post('http://localhost:5000/api/auth/register', {
                email,
                password,
                full_name: 'Browser Test Farmer',
                role: 'farmer',
                phone: '1122334455',
                address: 'Browser Test Lane',
                state: 'Karnataka',
                district: 'Mysore'
            });
            token = registerResponse.data.token;
            console.log('User registered.');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('User exists, logging in...');
                const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
                    email,
                    password
                });
                token = loginResponse.data.token;
                console.log('Logged in.');
            } else {
                throw error;
            }
        }

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Create Farm
        console.log('Creating Farm...');
        const farmRes = await axios.post('http://localhost:5000/api/farms', {
            farm_name: 'Browser Test Farm',
            latitude: 12.9,
            longitude: 77.5
        }, { headers });
        const farmId = farmRes.data.id;
        console.log(`Farm created with ID: ${farmId}`);

        // 3. Create Animal
        console.log('Creating Animal...');
        let animalId;
        try {
            const animalRes = await axios.post('http://localhost:5000/api/entities', {
                farm_id: farmId,
                entity_type: 'animal',
                species: 'Cattle',
                tag_id: `BROWSER-COW-${Date.now()}`,
                matrix: 'milk'
            }, { headers });
            animalId = animalRes.data.entity ? animalRes.data.entity.entity_id : animalRes.data.id;
            console.log(`Animal created with ID: ${animalId}`);
        } catch (err) {
            console.error('Animal Creation Failed:', err.response ? err.response.data : err.message);
            return; // Stop if animal creation fails
        }

        // 4. Create Treatment
        console.log('Creating Treatment...');
        try {
            await axios.post('http://localhost:5000/api/treatments', {
                entity_id: animalId,
                medication_type: 'antibiotic',
                medicine: 'Tetracycline',
                dose_amount: '15',
                dose_unit: 'mg/kg',
                route: 'IM',
                frequency_per_day: 1,
                duration_days: 5,
                start_date: 20231101,
                end_date: 20231106,
                vet_name: 'Dr. Browser',
                vet_id: 'VET999',
                reason: 'Fever',
                cause: 'Unknown'
            }, { headers });
            console.log('Treatment created.');
        } catch (err) {
            console.error('Treatment Creation Failed:', err.response ? err.response.data : err.message);
        }

        console.log('Setup Complete. Ready for browser login.');

    } catch (error) {
        console.error('Setup Failed:', error.response ? error.response.data : error.message);
    }
}

setupBrowserTestUser();
