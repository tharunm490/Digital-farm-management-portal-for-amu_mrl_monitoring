const axios = require('axios');
const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function setupVetTestUser() {
    const vetEmail = 'browser_test_vet@example.com';
    const vetPassword = 'password123';
    const farmerEmail = 'browser_test_farmer_for_vet@example.com';

    try {
        // 1. Register Vet
        console.log(`Setting up Vet: ${vetEmail}`);
        let vetToken;
        let vetUserId;
        try {
            const registerResponse = await axios.post('http://localhost:5000/api/auth/register', {
                email: vetEmail,
                password: vetPassword,
                full_name: 'Browser Test Vet',
                role: 'veterinarian',
                phone: '9876543210',
                license_number: 'VET-LIC-12345',
                state: 'Karnataka',
                district: 'Mysore'
            });
            vetToken = registerResponse.data.token;
            // We need user_id for assignment, let's decode token or fetch profile
            const profileRes = await axios.get('http://localhost:5000/api/auth/me', {
                headers: { Authorization: `Bearer ${vetToken}` }
            });
            vetUserId = profileRes.data.user_id;
            console.log(`Vet registered with ID: ${vetUserId}`);
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('Vet exists, logging in...');
                const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
                    email: vetEmail,
                    password: vetPassword
                });
                vetToken = loginResponse.data.token;
                const profileRes = await axios.get('http://localhost:5000/api/auth/me', {
                    headers: { Authorization: `Bearer ${vetToken}` }
                });
                vetUserId = profileRes.data.user_id;
                console.log(`Vet logged in with ID: ${vetUserId}`);
            } else {
                throw error;
            }
        }

        // 2. Register Farmer (to own the farm)
        console.log(`Setting up Farmer: ${farmerEmail}`);
        let farmerToken;
        try {
            const registerResponse = await axios.post('http://localhost:5000/api/auth/register', {
                email: farmerEmail,
                password: 'password123',
                full_name: 'Farmer for Vet Test',
                role: 'farmer',
                phone: '1122334466',
                address: 'Vet Test Lane',
                state: 'Karnataka',
                district: 'Mysore'
            });
            farmerToken = registerResponse.data.token;
        } catch (error) {
            if (error.response && error.response.status === 400) {
                const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
                    email: farmerEmail,
                    password: 'password123'
                });
                farmerToken = loginResponse.data.token;
            } else {
                throw error;
            }
        }

        const farmerHeaders = { Authorization: `Bearer ${farmerToken}` };

        // 3. Create Farm
        console.log('Creating Farm...');
        const farmRes = await axios.post('http://localhost:5000/api/farms', {
            farm_name: 'Vet Assigned Farm',
            latitude: 12.8,
            longitude: 77.6
        }, { headers: farmerHeaders });
        const farmId = farmRes.data.id;
        console.log(`Farm created with ID: ${farmId}`);

        // 4. Assign Vet to Farm (Direct DB update)
        console.log('Assigning Vet to Farm...');
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database
        });
        await connection.execute('UPDATE farms SET vet_id = ? WHERE farm_id = ?', [vetUserId, farmId]);
        await connection.end();
        console.log('Vet assigned.');

        // 5. Create Animal
        console.log('Creating Animal...');
        const animalRes = await axios.post('http://localhost:5000/api/entities', {
            farm_id: farmId,
            entity_type: 'animal',
            species: 'Cattle',
            tag_id: `VET-COW-${Date.now()}`,
            matrix: 'milk'
        }, { headers: farmerHeaders });
        const animalId = animalRes.data.entity ? animalRes.data.entity.entity_id : animalRes.data.id;
        console.log(`Animal created with ID: ${animalId}`);

        console.log('Setup Complete. Ready for Vet browser login.');

    } catch (error) {
        console.error('Setup Failed:', error.response ? error.response.data : error.message);
    }
}

setupVetTestUser();
