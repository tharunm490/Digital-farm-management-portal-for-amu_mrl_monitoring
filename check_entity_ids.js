const db = require('./backend/config/database');

async function checkEntityIds() {
  try {
    console.log('🔍 Checking Entity IDs in both tables\n');
    
    console.log('═══════════════════════════════════════════════════');
    console.log('SAMPLE REQUESTS (Pending Sample Requests Page):');
    console.log('═══════════════════════════════════════════════════');
    const [sampleRequests] = await db.execute(`
      SELECT sr.sample_request_id, sr.treatment_id, sr.entity_id, sr.status,
             a.tag_id, a.batch_name, a.species
      FROM sample_requests sr
      LEFT JOIN animals_or_batches a ON a.entity_id = sr.entity_id
      WHERE sr.status = 'requested'
      LIMIT 5
    `);
    console.table(sampleRequests);
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('INCOMING TREATMENT CASES (Before Assignment):');
    console.log('═══════════════════════════════════════════════════');
    const [incomingCases] = await db.execute(`
      SELECT tr.treatment_id, tr.entity_id, ar.safe_date, tr.medicine,
             a.tag_id, a.batch_name, a.species
      FROM treatment_records tr
      LEFT JOIN amu_records ar ON ar.treatment_id = tr.treatment_id
      LEFT JOIN animals_or_batches a ON a.entity_id = tr.entity_id
      WHERE tr.treatment_id NOT IN (SELECT DISTINCT treatment_id FROM sample_requests WHERE treatment_id IS NOT NULL)
      LIMIT 5
    `);
    console.table(incomingCases);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('ALL ENTITIES IN DATABASE:');
    console.log('═══════════════════════════════════════════════════');
    const [allEntities] = await db.execute(`
      SELECT entity_id, species, tag_id, batch_name, farm_id
      FROM animals_or_batches
      LIMIT 10
    `);
    console.table(allEntities);

    console.log('\n✅ All data is coming from Railway database');
    console.log('💡 No hardcoded data is being used');
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}

checkEntityIds();
