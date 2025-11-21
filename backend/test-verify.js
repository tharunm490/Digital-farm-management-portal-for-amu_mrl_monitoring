require('dotenv').config();
const Entity = require('./models/Entity');
const Treatment = require('./models/Treatment');
const AMU = require('./models/AMU');
const MRL = require('./models/MRL');

async function testVerifyEndpoint() {
  try {
    const entity_id = 4;
    console.log('Testing verify endpoint for entity ID:', entity_id);

    // Fetch entity details
    const entity = await Entity.getById(entity_id);
    console.log('Entity found:', entity);

    if (!entity) {
      console.log('Entity not found');
      return;
    }

    // Fetch all treatment records
    console.log('Fetching treatments...');
    const treatments = await Treatment.getByEntity(entity_id);
    console.log('Treatments found:', treatments);

    // Fetch all AMU records
    console.log('Fetching AMU records...');
    const amuRecords = await AMU.getByEntityId(entity_id);
    console.log('AMU records found:', amuRecords);

    // Fetch MRL data for this species and matrix
    console.log('Fetching MRL data for species:', entity.species, 'matrix:', entity.matrix);
    const mrlData = await MRL.getBySpeciesAndMatrix(entity.species, entity.matrix);
    console.log('MRL data found:', mrlData);

    console.log('All data fetched successfully!');

  } catch (error) {
    console.error('Error in verify endpoint:', error);
    console.error('Error stack:', error.stack);
  }
}

testVerifyEndpoint();