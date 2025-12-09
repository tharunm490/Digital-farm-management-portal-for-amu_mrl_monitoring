const db = require('./backend/config/database');

async function updateLabLocation() {
  try {
    console.log('🔧 Updating laboratory location data...\n');
    
    // Update lab_id 1 (thejas math, Bangalore Urban, Karnataka)
    // Bangalore coordinates: 12.9716° N, 77.5946° E
    await db.execute(`
      UPDATE laboratories 
      SET latitude = 12.9716, longitude = 77.5946 
      WHERE lab_id = 1
    `);
    
    console.log('✅ Lab #1 location updated: Bangalore (12.9716, 77.5946)');
    
    // Verify the update
    const [labs] = await db.execute('SELECT lab_id, lab_name, latitude, longitude, district, state FROM laboratories');
    console.log('\nCurrent Laboratories:');
    console.table(labs);
    
    console.log('\n✅ Laboratory location data is ready for smart assignment!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}

updateLabLocation();
