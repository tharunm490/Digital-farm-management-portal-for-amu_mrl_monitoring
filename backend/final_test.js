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
                    res.statusCode >= 400 ? reject({ status: res.statusCode, error: parsed }) : resolve(parsed);
                } catch (e) {
                    res.statusCode >= 400 ? reject({ status: res.statusCode, error: data }) : resolve(data);
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function test() {
    try {
        console.log('=== VERIFICATION TEST ===\n');

        // Login
        console.log('1. Login...');
        const login = await makeRequest('POST', '/auth/login', null, {
            email: 'farmer@test.com',
            password: 'farmer123'
        });
        console.log('   ✅ User ID:', login.user.user_id);

        // Create Farm
        console.log('\n2. Create Farm...');
        const farm = await makeRequest('POST', '/farms', login.token, {
            farm_name: 'Test Farm',
            location: 'Test',
            area: 100,
            state: 'Karnataka',
            district: 'Bangalore Urban'
        });
        console.log('   ✅ Farm ID:', farm.farm_id);

        // Create Animal
        console.log('\n3. Create Animal...');
        const animal = await makeRequest('POST', '/entities', login.token, {
            farm_id: farm.farm_id,
            entity_type: 'animal',
            species: 'cattle',
            tag_id: 'TEST-001',
            breed: 'Holstein',
            date_of_birth: '2023-01-01',
            matrix: 'meat'
        });
        console.log('   ✅ Entity ID:', animal.entity_id);

        // Create Treatment
        console.log('\n4. Create Treatment...');
        const treatment = await makeRequest('POST', '/treatments', login.token, {
            entity_id: animal.entity_id,
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
        console.log('   ✅ Treatment ID:', treatment.treatment_id);

        // Check AMU
        console.log('\n5. Check AMU Records...');
        const amu = await makeRequest('GET', '/amu', login.token);
        console.log('   ✅ AMU Records:', amu.length);
        if (amu.length > 0) {
            console.log('      - MRL:', amu[0].predicted_mrl);
            console.log('      - Withdrawal:', amu[0].predicted_withdrawal_days, 'days');
            console.log('      - Overdosage:', amu[0].overdosage || false);
        }

        console.log('\n=== ✅ ALL TESTS PASSED ===\n');
        process.exit(0);
    } catch (err) {
        console.log('\n=== ❌ TEST FAILED ===');
        console.error(err.error || err.message);
        process.exit(1);
    }
}

test();
