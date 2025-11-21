require('dotenv').config();
const db = require('./config/database');
const Entity = require('./models/Entity');

async function testEntity() {
  try {
    console.log('Testing entity lookup...');

    // Check if entity 4 exists
    const entity = await Entity.getById(4);
    console.log('Entity 4:', entity);

    // Get all entities
    const query = 'SELECT entity_id, entity_type, tag_id, batch_name, species, matrix FROM animals_or_batches ORDER BY entity_id DESC LIMIT 10';
    const [rows] = await db.execute(query);
    console.log('\nRecent entities:');
    console.table(rows);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testEntity();
