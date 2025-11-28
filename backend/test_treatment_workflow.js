const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testFullWorkflow() {
    try {
        console.log('=== TESTING FULL TREATMENT WORKFLOW ===\n');

        // 1. Login as farmer
        console.log('1. Logging in as farmer...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'farmer@test.com',
            password: 'farmer123'
        });
        const token = loginRes.data.token;
        const userId = loginRes.data.user.user_id;
        console.log('✅ Logged in, user_id:', userId);

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Create a farm
        console.log('\n2. Creating a test farm...');
        const farmRes = await axios.post(`${API_URL}/farms`, {
            farm_name: 'Test Farm for Treatment',
            location: 'Test Location',
            area: 100,
            state: 'Karnataka',
            district: 'Bangalore Urban'
        }, { headers });
        const farmId = farmRes.data.farm_id;
        console.log('✅ Created farm, farm_id:', farmId);

        // 3. Create an animal
        console.log('\n3. Creating a test animal...');
        const animalRes = await axios.post(`${API_URL}/entities`, {
            farm_id: farmId,
            entity_type: 'individual',
            species: 'cattle',
            tag_id: 'TEST-COW-001',
            breed: 'Holstein',
            date_of_birth: '2023-01-01',
            matrix: 'meat'
        }, { headers });
        const entityId = animalRes.data.entity_id;
        console.log('✅ Created animal, entity_id:', entityId);

        // 4. Create a treatment
        console.log('\n4. Creating a treatment...');
        const treatmentRes = await axios.post(`${API_URL}/treatments`, {
            entity_id: entityId,
            user_id: userId,
            medication_type: 'Antibiotic',
            medicine: 'Amoxicillin',
            dose_amount: 500,
            dose_unit: 'mg',
            route: 'IM',
            frequency_per_day: 2,
            duration_days: 5,
            start_date: '2025-01-01',
            end_date: '2025-01-05',
            vet_id: 1,
            vet_name: 'Dr. Test Vet',
            reason: 'Infection',
            cause: 'Bacterial infection'
        }, { headers });
        const treatmentId = treatmentRes.data.treatment_id;
        console.log('✅ Created treatment, treatment_id:', treatmentId);

        // 5. Check AMU records
        console.log('\n5. Checking AMU records...');
        const amuRes = await axios.get(`${API_URL}/amu`, { headers });
        console.log('✅ AMU Records found:', amuRes.data.length);
        if (amuRes.data.length > 0) {
            console.log('   Sample AMU record:', JSON.stringify(amuRes.data[0], null, 2));
        }

        // 6. Check notifications
        console.log('\n6. Checking notifications...');
        const notifRes = await axios.get(`${API_URL}/notifications`, { headers });
        console.log('✅ Notifications found:', notifRes.data.length);
        if (notifRes.data.length > 0) {
            console.log('   Sample notification:', JSON.stringify(notifRes.data[0], null, 2));
        }

        console.log('\n\n=== ✅ ALL TESTS PASSED ===');
        process.exit(0);
    } catch (err) {
        console.error('\n\n=== ❌ TEST FAILED ===');
        console.error('Error:', err.response?.data || err.message);
        console.error('Full error:', err);
        process.exit(1);
    }
}

testFullWorkflow();
