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
        needs_vet: false // Poultry water/feed doesn't need vet
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
                console.log(`✅ Using Existing Farm ID: ${farmId}`);
            } else {
                const newFarm = await req('POST', '/farms', l.token, {
                    farm_name: 'Test Farm ' + Date.now(),
                    latitude: 12.97,
                    longitude: 77.59
                });
                farmId = newFarm.farm_id || newFarm.id;
                console.log(`✅ Created New Farm ID: ${farmId}`);
            }
        } catch (e) {
            const newFarm = await req('POST', '/farms', l.token, {
                farm_name: 'Test Farm ' + Date.now(),
                latitude: 12.97,
                longitude: 77.59
            });
            farmId = newFarm.farm_id || newFarm.id;
            console.log(`✅ Created New Farm ID: ${farmId}`);
        }

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
                matrix: t.species === 'poultry' ? 'meat' : 'meat' // Default to meat
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
                treatData.vet_id = 1;
                treatData.vet_name = 'Dr. Test';
            }

            const treat = await req('POST', '/treatments', l.token, treatData);
            console.log(`   - Treatment Created: ${treat.treatment_id}`);
        }

        console.log('\n✅ ALL 5 RECORDS CREATED SUCCESSFULLY!');

    } catch (e) {
        console.log('\n❌ FAILED:', e.error || e);
    }
})();
