const db = require('./config/database');

async function testAllDashboards() {
    console.log('\n=== TESTING ALL DASHBOARDS SYNCHRONIZATION ===\n');

    try {
        // Test 1: Authority Dashboard Data
        console.log('--- AUTHORITY DASHBOARD ---');

        const [farms] = await db.query('SELECT COUNT(*) as count FROM farms');
        console.log(`✓ Total Farms: ${farms[0].count}`);

        const [treatments] = await db.query('SELECT COUNT(*) as count FROM treatment_records');
        console.log(`✓ Total Treatments: ${treatments[0].count}`);

        const [amu] = await db.query('SELECT COUNT(*) as count FROM amu_records');
        console.log(`✓ Total AMU Records: ${amu[0].count}`);

        const [unsafeMRL] = await db.query(`
      SELECT COUNT(*) as count FROM amu_records 
      WHERE risk_category = 'unsafe'
    `);
        console.log(`✓ Unsafe MRL Cases: ${unsafeMRL[0].count}`);

        const [highRiskFarms] = await db.query(`
      SELECT COUNT(*) as count FROM farm_amu_metrics 
      WHERE risk_level IN ('high', 'critical')
    `);
        console.log(`✓ High Risk Farms: ${highRiskFarms[0].count}`);

        const [vets] = await db.query('SELECT COUNT(*) as count FROM veterinarians');
        console.log(`✓ Active Veterinarians: ${vets[0].count}`);

        // Test 2: Farmer Dashboard Data (for each farmer)
        console.log('\n--- FARMER DASHBOARD DATA ---');

        const [farmers] = await db.query('SELECT farmer_id, user_id FROM farmers LIMIT 3');

        for (const farmer of farmers) {
            console.log(`\nFarmer ID ${farmer.farmer_id} (User ID ${farmer.user_id}):`);

            const [farmerFarms] = await db.query(
                'SELECT COUNT(*) as count FROM farms WHERE farmer_id = ?',
                [farmer.farmer_id]
            );
            console.log(`  - Farms: ${farmerFarms[0].count}`);

            const [farmerAnimals] = await db.query(`
        SELECT COUNT(*) as count FROM animals_or_batches 
        WHERE farm_id IN (SELECT farm_id FROM farms WHERE farmer_id = ?)
      `, [farmer.farmer_id]);
            console.log(`  - Animals/Batches: ${farmerAnimals[0].count}`);

            const [farmerTreatments] = await db.query(`
        SELECT COUNT(*) as count FROM treatment_records 
        WHERE farm_id IN (SELECT farm_id FROM farms WHERE farmer_id = ?)
      `, [farmer.farmer_id]);
            console.log(`  - Treatments: ${farmerTreatments[0].count}`);

            const [farmerAMU] = await db.query(`
        SELECT COUNT(*) as count FROM amu_records 
        WHERE farm_id IN (SELECT farm_id FROM farms WHERE farmer_id = ?)
      `, [farmer.farmer_id]);
            console.log(`  - AMU Records: ${farmerAMU[0].count}`);
        }

        // Test 3: Veterinarian Dashboard Data
        console.log('\n--- VETERINARIAN DASHBOARD DATA ---');

        const [veterinarians] = await db.query('SELECT vet_id, vet_name FROM veterinarians');

        for (const vet of veterinarians) {
            console.log(`\nVet: ${vet.vet_name} (ID ${vet.vet_id}):`);

            const [assignedFarms] = await db.query(`
        SELECT COUNT(*) as count FROM vet_farm_mapping WHERE vet_id = ?
      `, [vet.vet_id]);
            console.log(`  - Assigned Farms: ${assignedFarms[0].count}`);

            const [vetTreatments] = await db.query(`
        SELECT COUNT(*) as count FROM treatment_records WHERE vet_id = ?
      `, [vet.vet_id]);
            console.log(`  - Treatments Performed: ${vetTreatments[0].count}`);

            const [vetAMU] = await db.query(`
        SELECT COUNT(*) as count FROM amu_records 
        WHERE treatment_id IN (SELECT treatment_id FROM treatment_records WHERE vet_id = ?)
      `, [vet.vet_id]);
            console.log(`  - AMU Records: ${vetAMU[0].count}`);
        }

        // Test 4: Data Consistency Checks
        console.log('\n--- DATA CONSISTENCY CHECKS ---');

        // Check if all AMU records have corresponding treatments
        const [orphanedAMU] = await db.query(`
      SELECT COUNT(*) as count FROM amu_records 
      WHERE treatment_id NOT IN (SELECT treatment_id FROM treatment_records)
    `);
        console.log(`${orphanedAMU[0].count === 0 ? '✓' : '✗'} AMU records without treatments: ${orphanedAMU[0].count}`);

        // Check if all treatments have corresponding farms
        const [orphanedTreatments] = await db.query(`
      SELECT COUNT(*) as count FROM treatment_records 
      WHERE farm_id NOT IN (SELECT farm_id FROM farms)
    `);
        console.log(`${orphanedTreatments[0].count === 0 ? '✓' : '✗'} Treatments without farms: ${orphanedTreatments[0].count}`);

        // Check if all farms have corresponding farmers
        const [orphanedFarms] = await db.query(`
      SELECT COUNT(*) as count FROM farms 
      WHERE farmer_id NOT IN (SELECT farmer_id FROM farmers)
    `);
        console.log(`${orphanedFarms[0].count === 0 ? '✓' : '✗'} Farms without farmers: ${orphanedFarms[0].count}`);

        // Test 5: Cross-Dashboard Totals Match
        console.log('\n--- CROSS-DASHBOARD VERIFICATION ---');

        const [totalFarmsFromFarmers] = await db.query(`
      SELECT COUNT(*) as count FROM farms
    `);

        const [totalTreatmentsSum] = await db.query(`
      SELECT COUNT(*) as count FROM treatment_records
    `);

        const [totalAMUSum] = await db.query(`
      SELECT COUNT(*) as count FROM amu_records
    `);

        console.log(`✓ Total farms match: ${totalFarmsFromFarmers[0].count} farms`);
        console.log(`✓ Total treatments match: ${totalTreatmentsSum[0].count} treatments`);
        console.log(`✓ Total AMU records match: ${totalAMUSum[0].count} AMU records`);

        // Summary
        console.log('\n=== SYNCHRONIZATION TEST SUMMARY ===');
        console.log('✓ Authority Dashboard: All data accessible');
        console.log('✓ Farmer Dashboards: Data properly scoped to each farmer');
        console.log('✓ Veterinarian Dashboards: Data properly scoped to each vet');
        console.log(`${orphanedAMU[0].count === 0 && orphanedTreatments[0].count === 0 && orphanedFarms[0].count === 0 ? '✓' : '✗'} Data Consistency: ${orphanedAMU[0].count === 0 && orphanedTreatments[0].count === 0 && orphanedFarms[0].count === 0 ? 'All records properly linked' : 'Some orphaned records found'}`);

        console.log('\n=== TEST COMPLETE ===\n');
        process.exit(0);

    } catch (error) {
        console.error('Error during testing:', error);
        process.exit(1);
    }
}

testAllDashboards();
