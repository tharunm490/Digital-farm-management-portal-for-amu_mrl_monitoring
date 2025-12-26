const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    console.log('Database:', process.env.DB_NAME);

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'SIH'
    });

    try {
        // Check if vet_farm_mapping table exists
        const [tables] = await connection.query("SHOW TABLES LIKE 'vet_farm_mapping'");

        if (tables.length === 0) {
            console.log('Creating vet_farm_mapping table...');
            await connection.query(`
        CREATE TABLE vet_farm_mapping (
          mapping_id INT AUTO_INCREMENT PRIMARY KEY,
          vet_id INT NOT NULL,
          farm_id INT NOT NULL,
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vet_id) REFERENCES veterinarians(vet_id),
          FOREIGN KEY (farm_id) REFERENCES farms(farm_id),
          UNIQUE KEY unique_mapping (vet_id, farm_id)
        )
      `);
            console.log('✓ Table created');
        }

        // Get vets
        const [vets] = await connection.query('SELECT vet_id, vet_name FROM veterinarians LIMIT 1');
        if (vets.length === 0) {
            console.log('No vets found');
            await connection.end();
            return;
        }

        const vet = vets[0];
        console.log(`Using vet: ${vet.vet_name} (ID: ${vet.vet_id})`);

        // Get farms
        const [farms] = await connection.query('SELECT farm_id, farm_name FROM farms');
        console.log(`Found ${farms.length} farms`);

        // Assign vet to farms
        for (const farm of farms) {
            try {
                await connection.query(
                    'INSERT IGNORE INTO vet_farm_mapping (vet_id, farm_id) VALUES (?, ?)',
                    [vet.vet_id, farm.farm_id]
                );
                console.log(`✓ Assigned to ${farm.farm_name}`);
            } catch (err) {
                if (err.code !== 'ER_DUP_ENTRY') {
                    console.log(`  Already assigned to ${farm.farm_name}`);
                }
            }
        }

        console.log('\n✅ Done! Refresh your browser.');
        await connection.end();
    } catch (err) {
        console.error('Error:', err.message);
        await connection.end();
        process.exit(1);
    }
})();
