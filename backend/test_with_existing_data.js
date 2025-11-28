const http = require('http');

function makeRequest(method, path, token, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: `/api${path}`,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) {
                        reject({ status: res.statusCode, error: parsed, rawData: data });
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    if (res.statusCode >= 400) {
                        reject({ status: res.statusCode, error: data, rawData: data });
                    } else {
                        resolve(data);
                    }
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function testTreatment() {
    try {
        console.log('Testing Treatment Creation...\n');

        // Login
        const login = await makeRequest('POST', '/auth/login', null, {
            email: 'farmer@test.com',
            password: 'farmer123'
        });
        console.log('✅ Logged in');

        // Get existing farms
        const farmsRes = await makeRequest('GET', '/farms', login.token);
        const farms = farmsRes.data || farmsRes;

        let farmId;
        if (farms && farms.length > 0) {
            farmId = farms[0].farm_id;
            console.log('✅ Using existing farm:', farmId);
        } else {
            console.log('❌ No farms found. Please create a farm first through the UI.');
            process.exit(1);
        }

        // Get existing animals
        const entitiesRes = await makeRequest('GET', '/entities', login.token);
        const entities = entitiesRes.data || entitiesRes;

        let entityId;
        if (entities && entities.length > 0) {
            entityId = entities[0].entity_id;
            console.log('✅ Using existing animal:', entityId);
        } else {
            console.log('❌ No animals found. Please create an animal first through the UI.');
            process.exit(1);
        }

        // Create treatment
        console.log('\nCreating treatment...');
        const treatment = await makeRequest('POST', '/treatments', login.token, {
            entity_id: entityId,
            user_id: login.user.user_id,
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
            vet_name: 'Dr. Test',
            reason: 'Infection',
            cause: 'Test'
        });
        console.log('✅ Treatment created:', treatment.treatment_id);

        // Check AMU
        console.log('\nChecking AMU records...');
        const amu = await makeRequest('GET', '/amu', login.token);
        const amuList = amu.data || amu;
        console.log('✅ AMU Records:', Array.isArray(amuList) ? amuList.length : 'Error');

        if (Array.isArray(amuList) && amuList.length > 0) {
            console.log('\nLatest AMU Record:');
            console.log('  - Medicine:', amuList[0].medicine);
            console.log('  - MRL:', amuList[0].predicted_mrl);
            console.log('  - Withdrawal:', amuList[0].predicted_withdrawal_days, 'days');
            console.log('  - Overdosage:', amuList[0].overdosage || false);
        }

        // Check notifications
        console.log('\nChecking notifications...');
        try {
            const notif = await makeRequest('GET', '/notifications', login.token);
            const notifList = notif.data || notif;
            console.log('✅ Notifications:', Array.isArray(notifList) ? notifList.length : 'Error');
        } catch (err) {
            console.log('⚠️  Notifications error:', err.error || err.message);
        }

        console.log('\n✅ TEST COMPLETE\n');
        process.exit(0);
    } catch (err) {
        console.log('\n❌ TEST FAILED');
        console.error('Error:', err.error || err.message);
        if (err.rawData) console.error('Raw:', err.rawData);
        process.exit(1);
    }
}

testTreatment();
