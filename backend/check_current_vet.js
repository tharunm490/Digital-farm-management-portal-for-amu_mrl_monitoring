const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'SIH'
    });

    try {
        console.log('=== All Veterinarians ===');
        const [allVets] = await connection.query(`
      SELECT v.vet_id, v.vet_name, v.license_number, u.email, u.created_at
      FROM veterinarians v
      JOIN users u ON v.user_id = u.user_id
      ORDER BY v.vet_id DESC
    `);

        allVets.forEach((v, i) => {
            console.log(`${i + 1}. ${v.vet_name} (${v.email})`);
            console.log(`   ID: ${v.vet_id}, License: ${v.license_number || 'N/A'}`);
            console.log(`   Created: ${v.created_at}`);
        });

        console.log('\n=== Current Vet-Farm Mappings ===');
        const [mappings] = await connection.query(`
      SELECT v.vet_name, v.vet_id, COUNT(vfm.farm_id) as farm_count
      FROM vet_farm_mapping vfm
      JOIN veterinarians v ON vfm.vet_id = v.vet_id
      GROUP BY v.vet_id, v.vet_name
    `);

        if (mappings.length > 0) {
            mappings.forEach(m => {
                console.log(`✓ ${m.vet_name} (ID: ${m.vet_id}) → ${m.farm_count} farms`);
            });
        } else {
            console.log('No mappings found');
        }

        await connection.end();
    } catch (err) {
        console.error('Error:', err.message);
        await connection.end();
    }
})();
