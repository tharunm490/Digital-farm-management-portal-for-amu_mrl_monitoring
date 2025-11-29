const axios = require('axios');

async function verifyFarmerDashboard() {
    const email = 'yashasbrbtech24@rvu.edu.in'; // Using the known valid email
    const password = 'password123'; // Assuming this is the password, or I might need to reset it/create a new user if this fails. 
    // Actually, since I can't easily know the password for an existing Google user or if the local user has this password, 
    // I will use the test user creation flow again to be sure, or just check the routes code first.

    // Let's try to login with the test user created earlier if possible, or create a new one to be absolutely sure of the state.
    const testEmail = `farmer_test_${Date.now()}@example.com`;
    const testPassword = 'password123';

    try {
        console.log(`1. Registering new Farmer: ${testEmail}`);
        const registerResponse = await axios.post('http://localhost:5000/api/auth/register', {
            email: testEmail,
            password: testPassword,
            full_name: 'Test Farmer Dashboard',
            role: 'farmer',
            phone: '9998887776',
            address: 'Test Farm Road',
            state: 'Karnataka',
            district: 'Mandya'
        });
        const token = registerResponse.data.token;
        console.log('   Registration successful. Token obtained.');

        const headers = { Authorization: `Bearer ${token}` };

        console.log('2. Creating a Farm...');
        const farmRes = await axios.post('http://localhost:5000/api/farms', {
            farm_name: 'Green Valley Farm',
            latitude: 12.5,
            longitude: 76.5
        }, { headers });
        const farmId = farmRes.data.id;
        console.log(`   Farm created with ID: ${farmId}`);

        console.log('3. Adding an Animal...');
        const animalRes = await axios.post('http://localhost:5000/api/entities', {
            farm_id: farmId,
            entity_type: 'animal',
            species: 'cow',
            tag_id: `COW-${Date.now()}`,
            matrix: 'milk'
        }, { headers });
        const animalId = animalRes.data.entity.entity_id;
        console.log(`   Animal created with ID: ${animalId}`);

        console.log('4. Adding a Treatment...');
        const treatmentRes = await axios.post('http://localhost:5000/api/treatments', {
            entity_id: animalId,
            medication_type: 'antibiotic',
            medicine: 'Amoxicillin',
            dose_amount: '10',
            dose_unit: 'mg/kg',
            route: 'IM',
            frequency_per_day: 1,
            duration_days: 3,
            start_date: 20231025,
            end_date: 20231028,
            vet_name: 'Dr. Test',
            vet_id: 'VET001',
            reason: 'Infection',
            cause: 'Bacterial'
        }, { headers });
        console.log('   Treatment created.');

        console.log('5. Verifying Dashboard Data Fetching...');

        // Check Farms
        const myFarms = await axios.get('http://localhost:5000/api/farms/my-farms', { headers });
        console.log(`   My Farms: ${myFarms.data.length} (Expected >= 1)`);

        // Check Entities (Animals)
        const myEntities = await axios.get('http://localhost:5000/api/entities', { headers });
        console.log(`   My Entities: ${myEntities.data.length} (Expected >= 1)`);

        // Check Treatments
        const myTreatments = await axios.get('http://localhost:5000/api/treatments', { headers });
        console.log(`   My Treatments: ${myTreatments.data.length} (Expected >= 1)`);

        if (myFarms.data.length > 0 && myEntities.data.length > 0 && myTreatments.data.length > 0) {
            console.log('SUCCESS: All dashboard data points are accessible.');
        } else {
            console.error('FAILURE: Some data points are missing.');
        }

    } catch (error) {
        console.error('TEST FAILED:', error.response ? error.response.data : error.message);
    }
}

verifyFarmerDashboard();
