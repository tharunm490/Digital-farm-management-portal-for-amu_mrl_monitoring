const db = require('./config/database');

async function run() {
  try {
    // small delay to let pool attempt connections
    await new Promise(r => setTimeout(r, 1500));

    const [reqs] = await db.query('SELECT request_id, entity_id, farm_id, farmer_id, vet_id, status, created_at FROM treatment_requests WHERE entity_id = 1');
    console.log('---REQUESTS---');
    console.log(JSON.stringify(reqs, null, 2));

    const [treat] = await db.query('SELECT treatment_id, entity_id, farm_id, vet_id, status, start_date, end_date FROM treatment_records WHERE entity_id = 1');
    console.log('---TREATMENTS---');
    console.log(JSON.stringify(treat, null, 2));

    const [entity] = await db.query('SELECT entity_id, tag_id, batch_name, species, farm_id FROM animals_or_batches WHERE entity_id = 1');
    console.log('---ENTITY---');
    console.log(JSON.stringify(entity, null, 2));

    const farmId = entity && entity[0] ? entity[0].farm_id : null;
    if (farmId) {
      const [farm] = await db.query('SELECT farm_id, farm_name, farmer_id FROM farms WHERE farm_id = ?', [farmId]);
      console.log('---FARM---');
      console.log(JSON.stringify(farm, null, 2));

      const [maps] = await db.query('SELECT * FROM vet_farm_mapping WHERE farm_id = ?', [farmId]);
      console.log('---MAPPINGS---');
      console.log(JSON.stringify(maps, null, 2));

      const vetIds = maps.map(m => m.vet_id).filter(Boolean);
      if (vetIds.length > 0) {
        const [vets] = await db.query(`SELECT vet_id, user_id, vet_name FROM veterinarians WHERE vet_id IN (${vetIds.join(',')})`);
        console.log('---VETS---');
        console.log(JSON.stringify(vets, null, 2));
      } else {
        console.log('---VETS---');
        console.log('No vet mappings found for farm');
      }
    } else {
      console.log('No farm found for entity 1');
    }
  } catch (e) {
    console.error('ERROR RUNNING QUERIES:', e && e.message ? e.message : e);
  } finally {
    try { await db.end(); } catch(_){}
    process.exit();
  }
}

run();
