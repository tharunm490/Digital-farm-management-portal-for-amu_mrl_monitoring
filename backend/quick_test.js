const http = require('http');

function req(method, path, token, body) {
    return new Promise((resolve, reject) => {
        const opt = {
            hostname: 'localhost', port: 5000, path: `/api${path}`, method,
            headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        };
        const r = http.request(opt, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try {
                    const p = JSON.parse(d);
                    res.statusCode >= 400 ? reject(p) : resolve(p);
                } catch (e) { res.statusCode >= 400 ? reject(d) : resolve(d); }
            });
        });
        r.on('error', reject);
        if (body) r.write(JSON.stringify(body));
        r.end();
    });
}

(async () => {
    try {
        console.log('CREATING TEST DATA...\n');

        const l = await req('POST', '/auth/login', null, { email: 'farmer@test.com', password: 'farmer123' });
        console.log('✅ Login - User:', l.user.user_id, 'Farmer:', l.user.farmer_id);

        const a = await req('POST', '/entities', l.token, {
            farm_id: 7,
            entity_type: 'animal',
            species: 'cattle',
            tag_id: 'COW-' + Date.now(),
            breed: 'Holstein',
            date_of_birth: '2023-01-01',
            matrix: 'meat'
        });
        const entityId = a.entity.entity_id;
        console.log('✅ Animal:', entityId);

        const t = await req('POST', '/treatments', l.token, {
            entity_id: entityId,
            user_id: l.user.user_id,
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
        console.log('✅ Treatment:', t.treatment_id);

        await new Promise(r => setTimeout(r, 1000)); // Wait for AMU creation

        const amu = await req('GET', '/amu', l.token);
        const amuList = amu.data || amu;
        console.log('\n✅ AMU Records:', amuList.length);
        if (amuList.length > 0) {
            console.log('   Medicine:', amuList[0].medicine);
            console.log('   MRL:', amuList[0].predicted_mrl);
            console.log('   Withdrawal:', amuList[0].predicted_withdrawal_days, 'days');
            console.log('   Overdosage:', amuList[0].overdosage ? 'YES' : 'NO');
        }

        console.log('\n✅ DONE - Refresh your UI to see the data!\n');
    } catch (e) {
        console.log('\n❌ FAILED:', e.error || e);
    }
})();
