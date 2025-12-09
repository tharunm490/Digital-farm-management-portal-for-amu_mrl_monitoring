const db = require('./backend/config/database');

async function checkLabColumns() {
  try {
    console.log('Checking laboratories table columns...\n');
    
    const [cols] = await db.execute('SHOW COLUMNS FROM laboratories LIKE "latitude"');
    if (cols.length === 0) {
      console.log('❌ latitude column missing - Adding it now...');
      await db.execute('ALTER TABLE laboratories ADD COLUMN latitude DOUBLE NULL AFTER address');
      console.log('✅ latitude column added');
    } else {
      console.log('✅ latitude column exists');
    }
    
    const [cols2] = await db.execute('SHOW COLUMNS FROM laboratories LIKE "longitude"');
    if (cols2.length === 0) {
      console.log('❌ longitude column missing - Adding it now...');
      await db.execute('ALTER TABLE laboratories ADD COLUMN longitude DOUBLE NULL AFTER latitude');
      console.log('✅ longitude column added');
    } else {
      console.log('✅ longitude column exists');
    }

    console.log('\n✅ Laboratory table is ready for location-based assignment!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}

checkLabColumns();
