const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function createMappings() {
    const connection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: 'SIH'
    });

    // Get the vet ID
    const [vets] = await connection.query('SELECT vet_id FROM veterinarians LIMIT 1');
    if (vets.length === 0) {
        console.log('No vets found.');
        return;
    }
    const vetId = vets[0].vet_id;

    // Get all farms
    const [farms] = await connection.query('SELECT farm_id FROM farms');

    // Create mappings for each farm
    for (const farm of farms) {
        try {
            await connection.query(
                'INSERT INTO vet_farm_mapping (vet_id, farm_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE vet_id = vet_id',
                [vetId, farm.farm_id]
            );
        } catch (err) {
            console.log('Mapping may already exist for farm', farm.farm_id);
        }
    }

    console.log('Created mappings for', farms.length, 'farms with vet', vetId);

    await connection.end();
}

createMappings();
