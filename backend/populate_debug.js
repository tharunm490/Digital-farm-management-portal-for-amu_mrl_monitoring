const http = require('http');
const db = require('./config/database');

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

const treatments = [
    {
        species: 'cattle',
        medicine: 'Oxytetracycline',
        medication_type: 'Antibiotic',
        dose_amount: 20,
        dose_unit: 'mg/kg',
        route: 'IM',
        frequency_per_day: 1,
        duration_days: 3,
        reason: 'Respiratory Infection',
        cause: 'Bacterial',
        tag_prefix: 'COW',
        needs_vet: true
    },
    {
        species: 'poultry',
        medicine: 'Enrofloxacin',
        medication_type: 'Antibiotic',
        dose_amount: 10,
        dose_unit: 'mg/kg',
        route: 'water',
        frequency_per_day: 1,
        duration_days: 5,
        reason: 'Colibacillosis',
        cause: 'E. coli',
        tag_prefix: 'CHICK',
        needs_vet: false
    },
    {
        species: 'pig',
        medicine: 'Amoxicillin',
        medication_type: 'Antibiotic',
        dose_amount: 15,
        dose_unit: 'mg/kg',
        route: 'IM',
        frequency_per_day: 2,
        duration_days: 4,
        reason: 'Pneumonia',
        cause: 'Bacterial',
        tag_prefix: 'PIG',
        needs_vet: true
    },
    {
        species: 'sheep',
        medicine: 'Ivermectin',
        medication_type: 'Antiparasitic',
        dose_amount: 0.2,
        dose_unit: 'mg/kg',
        route: 'SC',
        frequency_per_day: 1,
        duration_days: 1,
        reason: 'Parasites',
        cause: 'Worms',
        tag_prefix: 'SHEEP',
        needs_vet: true
    },
    {
        species: 'goat',
        medicine: 'Tylosin',
        medication_type: 'Antibiotic',
        dose_amount: 10,
        dose_unit: 'mg/kg',
        route: 'IM',
        frequency_per_day: 1,
        duration_days: 5,
        reason: 'Foot Rot',
        cause: 'Bacterial',
        tag_prefix: 'GOAT',
        needs_vet: true
    }
];

(async () => {
    try {
        console.log('POPULATING 5 DATA POINTS...\n');

        // 0. Get a real vet
        const [vets] = await db.query('SELECT * FROM veterinarians LIMIT 1');
        if (vets.length === 0) throw new Error('No vets found in DB');
        const realVet = vets[0];
        console.log('✅ Using Vet:', realVet.vet_name, 'ID:', realVet.vet_id);

        // Login Farmer
        const l = await req('POST', '/auth/login', null, { email: 'farmer@test.com', password: 'farmer123' });
        console.log('✅ Logged in as Farmer');

        // Get Farm
        let farmId;
        try {
            const farmsRes = await req('GET', '/farms', l.token);
            const farms = farmsRes.data || farmsRes;
            if (Array.isArray(farms) && farms.length > 0) {
                farmId = farms[0].farm_id;
            } else {
                const newFarm = await req('POST', '/farms', l.token, {
                    farm_name: 'Test Farm ' + Date.now(),
                    latitude: 12.97,
                    longitude: 77.59
                });
                farmId = newFarm.farm_id || newFarm.id;
            }
        } catch (e) {
            const newFarm = await req('POST', '/farms', l.token, {
                farm_name: 'Test Farm ' + Date.now(),
                latitude: 12.97,
                longitude: 77.59
            });
            farmId = newFarm.farm_id || newFarm.id;
        }
        console.log(`✅ Using Farm ID: ${farmId}`);

        for (let i = 0; i < treatments.length; i++) {
            const t = treatments[i];
            console.log(`\nCreating Record ${i + 1}: ${t.species} - ${t.medicine}...`);

            // 1. Create Animal
            const animal = await req('POST', '/entities', l.token, {
                farm_id: farmId,
                entity_type: 'animal',
                species: t.species,
                tag_id: `${t.tag_prefix}-${Date.now()}-${i}`,
                breed: 'Standard',
                date_of_birth: '2023-01-01',
                matrix: 'meat'
            });
            const entityId = animal.entity ? animal.entity.entity_id : animal.entity_id;
            console.log(`   - Animal Created: ${entityId}`);

            // 2. Create Treatment
            const treatData = {
                entity_id: entityId,
                user_id: l.user.user_id,
                medication_type: t.medication_type,
                medicine: t.medicine,
                dose_amount: t.dose_amount,
                dose_unit: t.dose_unit,
                route: t.route,
                frequency_per_day: t.frequency_per_day,
                duration_days: t.duration_days,
                start_date: '2025-01-01',
                end_date: '2025-01-05',
                reason: t.reason,
                cause: t.cause
            };

            if (t.needs_vet) {
                treatData.vet_id = realVet.vet_id;
                treatData.vet_name = realVet.vet_name;
            }

            try {
                const treat = await req('POST', '/treatments', l.token, treatData);
                console.log(`   - Treatment Created: ${treat.treatment_id}`);
            } catch (err) {
                console.log('   ❌ Error creating treatment:', err);
                console.log('   Payload:', JSON.stringify(treatData));
            }
        }

        console.log('\n✅ DONE');
        process.exit(0);
    } catch (e) {
        console.log('\n❌ FAILED:', e.error || e);
        process.exit(1);
    }
})();
