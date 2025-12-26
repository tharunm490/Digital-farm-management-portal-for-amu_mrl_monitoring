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
        // Get the LATEST vet (most recently created)
        const [vets] = await connection.query(
            'SELECT v.vet_id, v.vet_name, u.email FROM veterinarians v JOIN users u ON v.user_id = u.user_id ORDER BY v.vet_id DESC LIMIT 1'
        );

        if (vets.length === 0) {
            console.log('No vets found');
            await connection.end();
            return;
        }

        const vet = vets[0];
        console.log(`Using latest vet: ${vet.vet_name} (${vet.email}, ID: ${vet.vet_id})`);

        // Clear old mappings and assign new vet
        console.log('\nClearing old vet assignments...');
        await connection.query('DELETE FROM vet_farm_mapping');

        // Get all farms
        const [farms] = await connection.query('SELECT farm_id, farm_name FROM farms');
        console.log(`\nAssigning to ${farms.length} farms:`);

        // Assign new vet to all farms
        for (const farm of farms) {
            await connection.query(
                'INSERT INTO vet_farm_mapping (vet_id, farm_id) VALUES (?, ?)',
                [vet.vet_id, farm.farm_id]
            );
            console.log(`  ✓ ${farm.farm_name}`);
        }

        console.log(`\n✅ Success! ${vet.vet_name} is now assigned to all ${farms.length} farms.`);
        console.log('\nRefresh your farmer dashboard to see the changes.');

        await connection.end();
    } catch (err) {
        console.error('Error:', err.message);
        await connection.end();
        process.exit(1);
    }
})();
