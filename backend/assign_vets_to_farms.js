const db = require('./config/database');

(async () => {
    try {
        console.log('=== Checking Current State ===\n');

        // Get all vets
        const [vets] = await db.pool.query(`
      SELECT v.vet_id, v.user_id, v.vet_name, v.license_number, v.state, v.district, u.email
      FROM veterinarians v
      JOIN users u ON v.user_id = u.user_id
    `);
        console.log(`Found ${vets.length} veterinarian(s):`);
        vets.forEach(v => console.log(`  - ${v.vet_name} (ID: ${v.vet_id}, Email: ${v.email}, Location: ${v.district}, ${v.state})`));

        // Get all farms
        const [farms] = await db.pool.query(`
      SELECT f.farm_id, f.farm_name, f.state, f.district, fa.farmer_name, u.email as farmer_email
      FROM farms f
      LEFT JOIN farmers fa ON f.farmer_id = fa.farmer_id
      LEFT JOIN users u ON fa.user_id = u.user_id
    `);
        console.log(`\nFound ${farms.length} farm(s):`);
        farms.forEach(f => console.log(`  - ${f.farm_name} (ID: ${f.farm_id}, Farmer: ${f.farmer_email}, Location: ${f.district}, ${f.state})`));

        // Get current mappings
        const [mappings] = await db.pool.query(`
      SELECT vfm.*, f.farm_name, v.vet_name
      FROM vet_farm_mapping vfm
      LEFT JOIN farms f ON vfm.farm_id = f.farm_id
      LEFT JOIN veterinarians v ON vfm.vet_id = v.vet_id
    `);
        console.log(`\nFound ${mappings.length} existing vet-farm mapping(s):`);
        if (mappings.length > 0) {
            mappings.forEach(m => console.log(`  - Vet: ${m.vet_name} → Farm: ${m.farm_name}`));
        } else {
            console.log('  (No mappings found)');
        }

        // Auto-assign vets to farms based on location
        if (vets.length > 0 && farms.length > 0) {
            console.log('\n=== Auto-Assigning Vets to Farms ===\n');

            for (const farm of farms) {
                // Check if farm already has a vet
                const existingMapping = mappings.find(m => m.farm_id === farm.farm_id);
                if (existingMapping) {
                    console.log(`✓ Farm "${farm.farm_name}" already has vet assigned`);
                    continue;
                }

                // Find a vet in the same location
                const matchingVet = vets.find(v =>
                    v.state === farm.state && v.district === farm.district
                );

                if (matchingVet) {
                    // Create mapping
                    await db.pool.query(
                        'INSERT INTO vet_farm_mapping (vet_id, farm_id) VALUES (?, ?)',
                        [matchingVet.vet_id, farm.farm_id]
                    );
                    console.log(`✓ Assigned ${matchingVet.vet_name} to farm "${farm.farm_name}"`);
                } else {
                    // Assign first available vet if no location match
                    const anyVet = vets[0];
                    await db.pool.query(
                        'INSERT INTO vet_farm_mapping (vet_id, farm_id) VALUES (?, ?)',
                        [anyVet.vet_id, farm.farm_id]
                    );
                    console.log(`✓ Assigned ${anyVet.vet_name} to farm "${farm.farm_name}" (no location match, using first available vet)`);
                }
            }

            // Show final mappings
            const [finalMappings] = await db.pool.query(`
        SELECT vfm.*, f.farm_name, v.vet_name
        FROM vet_farm_mapping vfm
        LEFT JOIN farms f ON vfm.farm_id = f.farm_id
        LEFT JOIN veterinarians v ON vfm.vet_id = v.vet_id
      `);
            console.log(`\n=== Final Vet-Farm Mappings (${finalMappings.length}) ===`);
            finalMappings.forEach(m => console.log(`  ✓ ${m.vet_name} → ${m.farm_name}`));
        }

        console.log('\n✅ Done! Refresh your farmer dashboard to see the changes.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
