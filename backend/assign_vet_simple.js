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
        // Get all vets
        const [vets] = await connection.query('SELECT vet_id, vet_name FROM veterinarians');
        console.log(`Found ${vets.length} veterinarian(s)`);

        if (vets.length === 0) {
            console.log('No veterinarians found. Please register a vet first.');
            await connection.end();
            return;
        }

        const vet = vets[0];
        console.log(`Using vet: ${vet.vet_name} (ID: ${vet.vet_id})`);

        // Get all farms
        const [farms] = await connection.query('SELECT farm_id, farm_name FROM farms');
        console.log(`Found ${farms.length} farm(s)`);

        // Assign vet to each farm
        for (const farm of farms) {
            // Check if mapping exists
            const [existing] = await connection.query(
                'SELECT * FROM vet_farm_mapping WHERE farm_id = ?',
                [farm.farm_id]
            );

            if (existing.length > 0) {
                console.log(`✓ Farm "${farm.farm_name}" already has vet assigned`);
            } else {
                await connection.query(
                    'INSERT INTO vet_farm_mapping (vet_id, farm_id) VALUES (?, ?)',
                    [vet.vet_id, farm.farm_id]
                );
                console.log(`✓ Assigned vet to farm "${farm.farm_name}"`);
            }
        }

        console.log('\n✅ Done! All farms now have vets assigned.');
        console.log('Refresh your farmer dashboard page to see the changes.');

        await connection.end();
    } catch (err) {
        console.error('Error:', err);
        await connection.end();
        process.exit(1);
    }
})();
