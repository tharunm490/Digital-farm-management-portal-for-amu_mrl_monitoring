const axios = require('axios');
const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function verifyTreatment() {
    let connection;
    try {
        // 1. Login as Vet to get Token
        console.log('Logging in as Vet...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'testvet_final@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        const vetId = loginRes.data.user.user_id;
        console.log('Vet Logged In. Token received.');

        // 2. Get Farm and Entity Details from DB
        connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database
        });

        const [farms] = await connection.execute('SELECT farm_id FROM farms WHERE vet_id = ? LIMIT 1', [vetId]);
        if (farms.length === 0) throw new Error('No farm assigned to this vet.');
        const farmId = farms[0].farm_id;

        const [entities] = await connection.execute('SELECT entity_id FROM animals_or_batches WHERE farm_id = ? LIMIT 1', [farmId]);
        if (entities.length === 0) throw new Error('No entities found on the assigned farm.');
        const entityId = entities[0].entity_id;

        console.log(`Testing with Farm ID: ${farmId}, Entity ID: ${entityId}`);

        // 3. Record Treatment via API
        console.log('Recording Treatment...');
        const treatmentData = {
            entity_id: entityId,
            medicine: 'Amoxicillin',
            medication_type: 'Antibiotic',
            dosage: '15',
            dose_unit: 'ml',
            frequency_per_day: 1,
            duration_days: 3,
            route: 'IM',
            reason: 'Bacterial Infection',
            diagnosis: 'Pneumonia',
            application_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            withdrawal_period_days: 14,
            is_vaccine: false
        };

        console.log(`Sending request to: http://localhost:5000/api/vet-treatments/farm/${farmId}/record`);
        const treatmentRes = await axios.post(`http://localhost:5000/api/vet-treatments/farm/${farmId}/record`, treatmentData, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000 // 10 seconds timeout
        });

        console.log('Treatment API Response:', treatmentRes.data);
        const treatmentId = treatmentRes.data.treatment_id;

        // 4. Verify DB Records
        console.log('Verifying Database Records...');

        // Check Treatment Record
        const [treatments] = await connection.execute('SELECT * FROM treatment_records WHERE treatment_id = ?', [treatmentId]);
        console.log('Treatment Record Found:', treatments.length > 0);

        // Check AMU Record
        const [amus] = await connection.execute('SELECT * FROM amu_records WHERE treatment_id = ?', [treatmentId]);
        console.log('AMU Record Found:', amus.length > 0);
        if (amus.length > 0) {
            console.log('AMU Risk Status:', amus[0].status);
            console.log('AMU Safe Date:', amus[0].safe_date);
        }

    } catch (error) {
        console.error('Verification Failed:', error.response ? error.response.data : error.message);
        if (error.code === 'ECONNABORTED') {
            console.error('Request timed out');
        }
    } finally {
        if (connection) await connection.end();
    }
}

verifyTreatment();
