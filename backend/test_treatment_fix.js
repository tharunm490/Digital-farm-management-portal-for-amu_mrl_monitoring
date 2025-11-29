const axios = require('axios');

async function testTreatmentRecording() {
    try {
        console.log('=== Testing Treatment Recording Fix ===\n');

        // 1. Login as Vet
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'browser_test_vet@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('✓ Logged in as vet');

        // 2. Record treatment with empty vaccine fields (this was causing the error)
        const treatmentData = {
            entity_id: 22,
            medicine: 'Penicillin Test',
            medication_type: 'Antibiotic',
            dosage: '20',
            dose_unit: 'ml',
            frequency_per_day: '2',
            duration_days: '7',
            route: 'IM',
            diagnosis: 'Bacterial infection',
            application_date: new Date().toISOString().split('T')[0],
            is_vaccine: false,
            vaccine_interval_days: '', // Empty string - this was causing the error
            vaccine_total_months: ''   // Empty string - this was causing the error
        };

        console.log('Submitting treatment with empty vaccine fields...');

        const recordRes = await axios.post(
            'http://localhost:5000/api/vet-treatments/farm/15/record',
            treatmentData,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('\n✅ Treatment recorded successfully!');
        console.log(`Treatment ID: ${recordRes.data.treatment_id}`);
        console.log(`Message: ${recordRes.data.message}`);

        process.exit(0);

    } catch (error) {
        console.error('\n✗ Error:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

testTreatmentRecording();
