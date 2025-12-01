const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function verifyData() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    console.log('\n=== DATABASE VERIFICATION ===\n');

    // Check users
    const [users] = await connection.query('SELECT user_id, email, role FROM users ORDER BY user_id');
    console.log('Users:', users.length);
    users.forEach(u => console.log(`  - ${u.email} (${u.role})`));

    // Check farms
    const [farms] = await connection.query('SELECT farm_id, farm_name, farmer_id, vet_id FROM farms');
    console.log('\nFarms:', farms.length);
    farms.forEach(f => console.log(`  - ${f.farm_name} (farmer: ${f.farmer_id}, vet: ${f.vet_id})`));

    // Check animals
    const [animals] = await connection.query('SELECT entity_id, tag_id, species, farm_id FROM animals_or_batches');
    console.log('\nAnimals:', animals.length);
    animals.forEach(a => console.log(`  - ${a.tag_id} (${a.species}) on farm ${a.farm_id}`));

    // Check treatment requests
    const [requests] = await connection.query('SELECT request_id, entity_id, status, vet_id FROM treatment_requests');
    console.log('\nTreatment Requests:', requests.length);
    requests.forEach(r => console.log(`  - Request ${r.request_id}: entity ${r.entity_id}, status: ${r.status}, vet: ${r.vet_id}`));

    // Check treatments
    const [treatments] = await connection.query('SELECT treatment_id, entity_id, medicine, vet_id FROM treatment_records');
    console.log('\nTreatments:', treatments.length);
    treatments.forEach(t => console.log(`  - Treatment ${t.treatment_id}: ${t.medicine} for entity ${t.entity_id}, vet: ${t.vet_id}`));

    // Check AMU records
    const [amu] = await connection.query('SELECT amu_id, treatment_id, medicine, predicted_mrl, safe_date FROM amu_records');
    console.log('\nAMU Records:', amu.length);
    amu.forEach(a => console.log(`  - AMU ${a.amu_id}: treatment ${a.treatment_id}, ${a.medicine}, MRL: ${a.predicted_mrl}, safe: ${a.safe_date}`));

    // Check vet-farm mappings
    const [mappings] = await connection.query('SELECT vet_id, farm_id FROM vet_farm_mapping');
    console.log('\nVet-Farm Mappings:', mappings.length);
    mappings.forEach(m => console.log(`  - Vet ${m.vet_id} -> Farm ${m.farm_id}`));

    console.log('\n=== VERIFICATION COMPLETE ===\n');

    await connection.end();
}

verifyData();
