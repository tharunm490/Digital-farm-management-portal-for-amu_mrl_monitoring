const axios = require('axios');

async function testVetRecord() {
    try {
        // 1. Login as Vet
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'browser_test_vet@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Logged in, token:', token);

        // 2. Get Assigned Farms (to get a valid farm ID)
        const farmsRes = await axios.get('http://localhost:5000/api/vet-treatments/assigned-farms/withdrawals', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const farm = farmsRes.data[0];
        if (!farm) {
            console.error('No assigned farms found');
            return;
        }
        console.log('Using Farm:', farm.farm_id);

        // 3. Get Entities (to get a valid entity ID)
        const entitiesRes = await axios.get(`http://localhost:5000/api/vet-treatments/farm/${farm.farm_id}/entities`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const entity = entitiesRes.data[0];
        if (!entity) {
            console.error('No entities found');
            return;
        }
        console.log('Using Entity:', entity.entity_id);

        // 4. Record Treatment
        const treatmentData = {
            entity_id: entity.entity_id,
            medicine: 'Test Med',
            medication_type: 'Antibiotic',
            dosage: '10',
            dose_unit: 'ml',
            frequency_per_day: '1',
            duration_days: '3',
            route: 'IM',
            reason: 'Test Reason',
            diagnosis: 'Test Diagnosis',
            application_date: new Date().toISOString().split('T')[0]
        };

        console.log('Sending Treatment Data:', treatmentData);

        const recordRes = await axios.post(`http://localhost:5000/api/vet-treatments/farm/${farm.farm_id}/record`, treatmentData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Record Response:', recordRes.data);

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testVetRecord();
