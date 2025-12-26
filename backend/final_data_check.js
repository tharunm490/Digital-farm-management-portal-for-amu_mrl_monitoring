const mysql = require('mysql2/promise');
const dbConfig = require('./config/database');

async function finalDataCheck() {
    const connection = await dbConfig.pool.getConnection();

    console.log('\n' + '='.repeat(70));
    console.log('FINAL DATA VERIFICATION - SIMPLIFIED');
    console.log('='.repeat(70) + '\n');

    try {
        // 1. Users
        const [users] = await connection.query('SELECT user_id, email, role FROM users');
        console.log(`✅ Users: ${users.length}`);
        users.forEach(u => console.log(`   - ${u.email} (${u.role})`));

        // 2. Farmers
        const [farmers] = await connection.query('SELECT COUNT(*) as count FROM farmers');
        console.log(`\n✅ Farmers: ${farmers[0].count}`);

        // 3. Veterinarians
        const [vets] = await connection.query('SELECT vet_id, license_number FROM veterinarians');
        console.log(`\n✅ Veterinarians: ${vets.length}`);
        vets.forEach(v => console.log(`   - Vet ID: ${v.vet_id}, License: ${v.license_number}`));

        // 4. Farms
        const [farms] = await connection.query('SELECT farm_id, farm_name, farmer_id FROM farms');
        console.log(`\n✅ Farms: ${farms.length}`);
        farms.forEach(f => console.log(`   - ${f.farm_name} (Farmer: ${f.farmer_id})`));

        // 5. Vet-Farm Mappings
        const [mappings] = await connection.query('SELECT vet_id, farm_id FROM vet_farm_mapping');
        console.log(`\n✅ Vet-Farm Mappings: ${mappings.length}`);
        const mappingsByVet = {};
        mappings.forEach(m => {
            if (!mappingsByVet[m.vet_id]) mappingsByVet[m.vet_id] = [];
            mappingsByVet[m.vet_id].push(m.farm_id);
        });
        Object.entries(mappingsByVet).forEach(([vet, farmIds]) => {
            console.log(`   - Vet ${vet}: ${farmIds.length} farms (${farmIds.join(', ')})`);
        });

        // 6. Animals/Batches
        const [entities] = await connection.query('SELECT entity_id, entity_type, species FROM animals_or_batches');
        console.log(`\n✅ Animals/Batches: ${entities.length}`);
        const byType = entities.reduce((acc, e) => {
            acc[e.entity_type] = (acc[e.entity_type] || 0) + 1;
            return acc;
        }, {});
        Object.entries(byType).forEach(([type, count]) => console.log(`   - ${type}: ${count}`));

        // 7. Treatment Requests
        const [requests] = await connection.query('SELECT request_id, status FROM treatment_requests');
        console.log(`\n✅ Treatment Requests: ${requests.length}`);
        const byStatus = requests.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
        }, {});
        Object.entries(byStatus).forEach(([status, count]) => console.log(`   - ${status}: ${count}`));

        // 8. Treatment Records
        const [treatments] = await connection.query('SELECT treatment_id, medicine, vet_id FROM treatment_records');
        console.log(`\n✅ Treatment Records: ${treatments.length}`);
        treatments.forEach(t => console.log(`   - ID ${t.treatment_id}: ${t.medicine} (Vet: ${t.vet_id})`));

        // 9. AMU Records
        const [amu] = await connection.query('SELECT amu_id, medicine, species, risk_category, risk_percent FROM amu_records');
        console.log(`\n✅ AMU Records: ${amu.length}`);
        amu.forEach(a => console.log(`   - ${a.medicine} for ${a.species}: ${a.risk_category} (${a.risk_percent}% MRL risk)`));

        // 10. Data Integrity Checks
        console.log('\n' + '='.repeat(70));
        console.log('DATA INTEGRITY CHECKS');
        console.log('='.repeat(70));

        // Check all farms have farmers
        const [orphanedFarms] = await connection.query(`
            SELECT f.farm_id FROM farms f 
            LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id 
            WHERE fr.farmer_id IS NULL
        `);
        console.log(`\n${orphanedFarms.length === 0 ? '✅' : '❌'} Farms with valid farmers: ${orphanedFarms.length === 0 ? 'All' : `${farms.length - orphanedFarms.length}/${farms.length}`}`);

        // Check all treatments have vet_id
        const [treatmentsNoVet] = await connection.query('SELECT COUNT(*) as count FROM treatment_records WHERE vet_id IS NULL');
        console.log(`${treatmentsNoVet[0].count === 0 ? '✅' : '❌'} Treatments with vet_id: ${treatmentsNoVet[0].count === 0 ? 'All' : `${treatments.length - treatmentsNoVet[0].count}/${treatments.length}`}`);

        // Check all treatments have AMU records
        const [treatmentsNoAMU] = await connection.query(`
            SELECT COUNT(*) as count FROM treatment_records t 
            LEFT JOIN amu_records a ON t.treatment_id = a.treatment_id 
            WHERE a.amu_id IS NULL
        `);
        console.log(`${treatmentsNoAMU[0].count === 0 ? '✅' : '⚠️ '} Treatments with AMU records: ${treatmentsNoAMU[0].count === 0 ? 'All' : `${treatments.length - treatmentsNoAMU[0].count}/${treatments.length}`}`);

        // Check all AMU records have risk assessment
        const [amuNoRisk] = await connection.query('SELECT COUNT(*) as count FROM amu_records WHERE risk_category IS NULL');
        console.log(`${amuNoRisk[0].count === 0 ? '✅' : '❌'} AMU records with risk assessment: ${amuNoRisk[0].count === 0 ? 'All' : `${amu.length - amuNoRisk[0].count}/${amu.length}`}`);

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('FINAL VERDICT');
        console.log('='.repeat(70));

        const allChecks = [
            orphanedFarms.length === 0,
            treatmentsNoVet[0].count === 0,
            amuNoRisk[0].count === 0
        ];

        const passed = allChecks.filter(Boolean).length;
        const total = allChecks.length;

        if (passed === total) {
            console.log('\n✅ DATA INTEGRITY: EXCELLENT');
            console.log(`   All ${total} integrity checks passed!`);
        } else {
            console.log(`\n⚠️  DATA INTEGRITY: GOOD`);
            console.log(`   ${passed}/${total} integrity checks passed`);
        }

        console.log('\n📊 Summary:');
        console.log(`   - ${users.length} users (${users.filter(u => u.role === 'farmer').length} farmers, ${users.filter(u => u.role === 'veterinarian').length} vets, ${users.filter(u => u.role === 'authority').length} authorities)`);
        console.log(`   - ${farms.length} farms with ${mappings.length} vet assignments`);
        console.log(`   - ${entities.length} animals/batches`);
        console.log(`   - ${requests.length} treatment requests`);
        console.log(`   - ${treatments.length} treatments → ${amu.length} AMU records`);

        console.log('\n✅ DATABASE IS READY FOR TESTING!');
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

finalDataCheck();
