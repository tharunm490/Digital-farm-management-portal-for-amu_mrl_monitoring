const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function verifyDataIntegrity() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    console.log('\n' + '='.repeat(70));
    console.log('FINAL DATA INTEGRITY VERIFICATION');
    console.log('='.repeat(70) + '\n');

    const issues = [];
    const warnings = [];

    // 1. Check Users
    console.log('1️⃣  USERS VERIFICATION\n');
    const [users] = await connection.query('SELECT user_id, email, role FROM users ORDER BY user_id');
    console.log(`   Total Users: ${users.length}`);
    users.forEach(u => console.log(`   - ${u.email} (${u.role})`));

    if (users.length < 3) warnings.push('Expected at least 3 users (farmer, vet, authority)');

    // 2. Check Farmers
    console.log('\n2️⃣  FARMERS VERIFICATION\n');
    const [farmers] = await connection.query(`
        SELECT f.farmer_id, u.email, f.phone, f.state, f.district 
        FROM farmers f 
        JOIN users u ON f.user_id = u.user_id
    `);
    console.log(`   Total Farmers: ${farmers.length}`);
    farmers.forEach(f => console.log(`   - ${f.email} (${f.state}, ${f.district})`));

    // 3. Check Veterinarians
    console.log('\n3️⃣  VETERINARIANS VERIFICATION\n');
    const [vets] = await connection.query(`
        SELECT v.vet_id, u.email, v.license_number, v.state, v.district 
        FROM veterinarians v 
        JOIN users u ON v.user_id = u.user_id
    `);
    console.log(`   Total Vets: ${vets.length}`);
    vets.forEach(v => console.log(`   - ${v.email} (License: ${v.license_number})`));

    // 4. Check Authorities
    console.log('\n4️⃣  AUTHORITIES VERIFICATION\n');
    const [authorities] = await connection.query(`
        SELECT a.authority_id, u.email, a.department 
        FROM authorities a 
        JOIN users u ON a.user_id = u.user_id
    `);
    console.log(`   Total Authorities: ${authorities.length}`);
    authorities.forEach(a => console.log(`   - ${a.email} (${a.department || 'N/A'})`));

    // 5. Check Farms
    console.log('\n5️⃣  FARMS VERIFICATION\n');
    const [farms] = await connection.query(`
        SELECT f.farm_id, f.farm_name, f.farmer_id, f.vet_id, fr.state, fr.district 
        FROM farms f
        LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
    `);
    console.log(`   Total Farms: ${farms.length}`);
    farms.forEach(f => {
        console.log(`   - ${f.farm_name} (Farmer: ${f.farmer_id}, Vet: ${f.vet_id || 'None'})`);
        if (!f.farmer_id) issues.push(`Farm ${f.farm_id} has no farmer assigned`);
    });

    // 6. Check Vet-Farm Mappings
    console.log('\n6️⃣  VET-FARM MAPPINGS VERIFICATION\n');
    const [mappings] = await connection.query(`
        SELECT vfm.vet_id, vfm.farm_id, f.farm_name, v.license_number
        FROM vet_farm_mapping vfm
        JOIN farms f ON vfm.farm_id = f.farm_id
        JOIN veterinarians v ON vfm.vet_id = v.vet_id
    `);
    console.log(`   Total Mappings: ${mappings.length}`);
    mappings.forEach(m => console.log(`   - Vet ${m.vet_id} → Farm ${m.farm_id} (${m.farm_name})`));

    if (mappings.length === 0) warnings.push('No vet-farm mappings found');

    // 7. Check Animals/Batches
    console.log('\n7️⃣  ANIMALS/BATCHES VERIFICATION\n');
    const [entities] = await connection.query(`
        SELECT e.entity_id, e.entity_type, e.tag_id, e.batch_name, e.species, e.matrix, f.farm_name
        FROM animals_or_batches e
        JOIN farms f ON e.farm_id = f.farm_id
    `);
    console.log(`   Total Entities: ${entities.length}`);
    entities.forEach(e => {
        const name = e.entity_type === 'animal' ? e.tag_id : e.batch_name;
        console.log(`   - ${name} (${e.species}, ${e.matrix}) on ${e.farm_name}`);
        if (!e.species) issues.push(`Entity ${e.entity_id} missing species`);
        if (!e.matrix) issues.push(`Entity ${e.entity_id} missing matrix`);
    });

    // 8. Check Treatment Requests
    console.log('\n8️⃣  TREATMENT REQUESTS VERIFICATION\n');
    const [requests] = await connection.query(`
        SELECT tr.request_id, tr.entity_id, tr.status, tr.vet_id, e.tag_id, e.batch_name
        FROM treatment_requests tr
        JOIN animals_or_batches e ON tr.entity_id = e.entity_id
    `);
    console.log(`   Total Requests: ${requests.length}`);
    requests.forEach(r => {
        const name = r.tag_id || r.batch_name;
        console.log(`   - Request ${r.request_id}: ${name}, Status: ${r.status}, Vet: ${r.vet_id || 'Unassigned'}`);
    });

    // 9. Check Treatment Records
    console.log('\n9️⃣  TREATMENT RECORDS VERIFICATION\n');
    const [treatments] = await connection.query(`
        SELECT t.treatment_id, t.entity_id, t.medicine, t.vet_id, e.tag_id, e.batch_name
        FROM treatment_records t
        JOIN animals_or_batches e ON t.entity_id = e.entity_id
    `);
    console.log(`   Total Treatments: ${treatments.length}`);
    treatments.forEach(t => {
        const name = t.tag_id || t.batch_name;
        console.log(`   - Treatment ${t.treatment_id}: ${t.medicine} for ${name}, Vet: ${t.vet_id}`);
        if (!t.vet_id) issues.push(`Treatment ${t.treatment_id} missing vet_id`);
    });

    // 10. Check AMU Records
    console.log('\n🔟 AMU RECORDS VERIFICATION\n');
    const [amuRecords] = await connection.query(`
        SELECT a.amu_id, a.treatment_id, a.medicine, a.species, a.risk_category, a.risk_percent, a.safe_date
        FROM amu_records a
    `);
    console.log(`   Total AMU Records: ${amuRecords.length}`);
    amuRecords.forEach(a => {
        console.log(`   - AMU ${a.amu_id}: ${a.medicine} (${a.species}), Risk: ${a.risk_category}, MRL: ${a.risk_percent}%, Safe: ${a.safe_date}`);
        if (!a.risk_category) warnings.push(`AMU ${a.amu_id} missing risk_category`);
        if (!a.safe_date) warnings.push(`AMU ${a.amu_id} missing safe_date`);
    });

    // 11. Data Consistency Checks
    console.log('\n1️⃣1️⃣  DATA CONSISTENCY CHECKS\n');

    // Check orphaned farms
    const [orphanedFarms] = await connection.query(`
        SELECT f.farm_id, f.farm_name 
        FROM farms f 
        LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id 
        WHERE fr.farmer_id IS NULL
    `);
    if (orphanedFarms.length > 0) {
        issues.push(`${orphanedFarms.length} farms without valid farmer`);
        orphanedFarms.forEach(f => console.log(`   ⚠️  Orphaned Farm: ${f.farm_name}`));
    } else {
        console.log('   ✅ All farms have valid farmers');
    }

    // Check treatments without AMU records
    const [treatmentsWithoutAMU] = await connection.query(`
        SELECT t.treatment_id, t.medicine 
        FROM treatment_records t 
        LEFT JOIN amu_records a ON t.treatment_id = a.treatment_id 
        WHERE a.amu_id IS NULL
    `);
    if (treatmentsWithoutAMU.length > 0) {
        warnings.push(`${treatmentsWithoutAMU.length} treatments without AMU records`);
        treatmentsWithoutAMU.forEach(t => console.log(`   ⚠️  Treatment ${t.treatment_id} (${t.medicine}) has no AMU record`));
    } else {
        console.log('   ✅ All treatments have AMU records');
    }

    // Check entities without farms
    const [entitiesWithoutFarms] = await connection.query(`
        SELECT e.entity_id, e.tag_id, e.batch_name 
        FROM animals_or_batches e 
        LEFT JOIN farms f ON e.farm_id = f.farm_id 
        WHERE f.farm_id IS NULL
    `);
    if (entitiesWithoutFarms.length > 0) {
        issues.push(`${entitiesWithoutFarms.length} entities without valid farm`);
    } else {
        console.log('   ✅ All entities belong to valid farms');
    }

    // 12. Summary
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(70));

    console.log(`\n📊 Data Counts:`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Farmers: ${farmers.length}`);
    console.log(`   Veterinarians: ${vets.length}`);
    console.log(`   Authorities: ${authorities.length}`);
    console.log(`   Farms: ${farms.length}`);
    console.log(`   Vet-Farm Mappings: ${mappings.length}`);
    console.log(`   Animals/Batches: ${entities.length}`);
    console.log(`   Treatment Requests: ${requests.length}`);
    console.log(`   Treatment Records: ${treatments.length}`);
    console.log(`   AMU Records: ${amuRecords.length}`);

    console.log(`\n🔍 Issues Found: ${issues.length}`);
    if (issues.length > 0) {
        issues.forEach(issue => console.log(`   ❌ ${issue}`));
    } else {
        console.log('   ✅ No critical issues found!');
    }

    console.log(`\n⚠️  Warnings: ${warnings.length}`);
    if (warnings.length > 0) {
        warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
    } else {
        console.log('   ✅ No warnings!');
    }

    console.log('\n' + '='.repeat(70));
    if (issues.length === 0 && warnings.length === 0) {
        console.log('✅ DATA INTEGRITY: EXCELLENT');
    } else if (issues.length === 0) {
        console.log('✅ DATA INTEGRITY: GOOD (Minor warnings only)');
    } else {
        console.log('⚠️  DATA INTEGRITY: NEEDS ATTENTION');
    }
    console.log('='.repeat(70) + '\n');

    await connection.end();
}

verifyDataIntegrity().catch(console.error);
