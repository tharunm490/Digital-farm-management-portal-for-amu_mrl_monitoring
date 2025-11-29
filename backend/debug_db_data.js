const db = require('./config/database');
const fs = require('fs');

async function debugData() {
    try {
        console.log('--- Users ---');
        const [users] = await db.query('SELECT user_id, email, display_name, role FROM users');

        console.log('--- Farms ---');
        const [farms] = await db.query('SELECT farm_id, farm_name, farmer_id, vet_id FROM farms');

        console.log('--- Animals ---');
        const [animals] = await db.query('SELECT entity_id, farm_id, tag_id FROM animals_or_batches');

        let output = '';
        output += '--- Users ---\n' + JSON.stringify(users, null, 2) + '\n';
        output += '--- Farms ---\n' + JSON.stringify(farms, null, 2) + '\n';
        output += '--- Animals ---\n' + JSON.stringify(animals, null, 2) + '\n';
        fs.writeFileSync('db_dump.txt', output);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

debugData();
