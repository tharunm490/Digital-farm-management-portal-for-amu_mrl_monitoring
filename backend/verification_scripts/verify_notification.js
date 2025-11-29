const axios = require('axios');
const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function verifyNotification() {
    let connection;
    try {
        // 1. Login as Vet
        console.log('Logging in as Vet...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'testvet_final@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        const vetId = loginRes.data.user.user_id;
        console.log('Vet Logged In.');

        // 2. Get Farm and Entity
        connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database
        });

        const [farms] = await connection.execute('SELECT farm_id FROM farms WHERE vet_id = ? LIMIT 1', [vetId]);
        if (farms.length === 0) throw new Error('No farm assigned.');
        const farmId = farms[0].farm_id;

        const [entities] = await connection.execute('SELECT entity_id, species FROM animals_or_batches WHERE farm_id = ? LIMIT 1', [farmId]);
        if (entities.length === 0) throw new Error('No entities found.');
        const entityId = entities[0].entity_id;
        const species = entities[0].species;

        console.log(`Testing with Farm ID: ${farmId}, Entity ID: ${entityId}, Species: ${species}`);

        // 3. Record Unsafe Treatment (High Dosage)
        console.log('Recording Unsafe Treatment...');
        const treatmentData = {
            entity_id: entityId,
            medicine: 'Colistin', // Often restricted or has strict limits
            medication_type: 'Antibiotic',
            dosage: '1000', // Intentionally high dosage
            dose_unit: 'mg/kg',
            frequency_per_day: 2,
            duration_days: 5,
            route: 'IM',
            reason: 'Severe Infection',
            diagnosis: 'Sepsis',
            application_date: new Date().toISOString().split('T')[0],
            withdrawal_period_days: 30,
            is_vaccine: false
        };

        const treatmentRes = await axios.post(`http://localhost:5000/api/vet-treatments/farm/${farmId}/record`, treatmentData, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
        });

        console.log('Treatment Recorded:', treatmentRes.data.treatment_id);
        const treatmentId = treatmentRes.data.treatment_id;

        // 4. Verify Notification
        console.log('Verifying Notification...');
        // Wait a bit for async notification creation (though it's awaited in code)
        await new Promise(r => setTimeout(r, 1000));

        const [notifications] = await connection.execute(
            'SELECT * FROM notifications WHERE treatment_id = ? AND type = ?',
            [treatmentId, 'alert']
        );

        console.log('Notifications Found:', notifications.length);
        if (notifications.length > 0) {
            console.log('Notification Message:', notifications[0].message);
            console.log('Notification Subtype:', notifications[0].subtype);
        } else {
            console.warn('No notification found! Check if dosage was high enough or drug is restricted.');
        }

    } catch (error) {
        console.error('Verification Failed:', error.response ? error.response.data : error.message);
    } finally {
        if (connection) await connection.end();
    }
}

verifyNotification();
