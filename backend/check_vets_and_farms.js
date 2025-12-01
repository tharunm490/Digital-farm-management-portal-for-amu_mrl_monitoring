const db = require('./config/database');

(async () => {
    try {
        console.log('=== Checking Veterinarians ===');
        const [vets] = await db.pool.query(`
      SELECT v.*, u.email, u.display_name 
      FROM veterinarians v 
      JOIN users u ON v.user_id = u.user_id
    `);
        console.log(`Found ${vets.length} veterinarians:`);
        console.log(JSON.stringify(vets, null, 2));

        console.log('\n=== Checking Vet-Farm Mappings ===');
        const [mappings] = await db.pool.query(`
      SELECT vfm.*, f.farm_name, v.vet_name 
      FROM vet_farm_mapping vfm
      LEFT JOIN farms f ON vfm.farm_id = f.farm_id
      LEFT JOIN veterinarians v ON vfm.vet_id = v.vet_id
    `);
        console.log(`Found ${mappings.length} vet-farm mappings:`);
        console.log(JSON.stringify(mappings, null, 2));

        console.log('\n=== Checking Farms ===');
        const [farms] = await db.pool.query('SELECT * FROM farms');
        console.log(`Found ${farms.length} farms:`);
        console.log(JSON.stringify(farms, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
