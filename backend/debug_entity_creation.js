const Entity = require('./models/Entity');
const db = require('./config/database');
const fs = require('fs');

async function debugEntityCreation() {
    try {
        console.log('Starting debug...');

        // 1. Get a valid farm ID
        const [farms] = await db.query('SELECT farm_id FROM farms LIMIT 1');
        if (farms.length === 0) {
            console.error('No farms found to test with.');
            process.exit(1);
        }
        const farmId = farms[0].farm_id;
        console.log(`Using Farm ID: ${farmId}`);

        // 2. Try to create entity
        const entityData = {
            farm_id: farmId,
            entity_type: 'animal',
            species: 'cow',
            tag_id: `DEBUG-COW-${Date.now()}`,
            matrix: 'milk'
        };

        console.log('Attempting to create entity with data:', entityData);
        const entityId = await Entity.create(entityData);
        console.log(`Entity created successfully with ID: ${entityId}`);
        process.exit(0);

    } catch (error) {
        fs.writeFileSync('debug_error.log', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        console.error('Debug Failed:', error);
        process.exit(1);
    }
}

debugEntityCreation();
