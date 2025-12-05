const db = require('./config/database');

async function checkTable() {
  try {
    const [columns] = await db.query(`DESCRIBE treatment_records`);
    
    console.log('Treatment records table structure:');
    console.table(columns);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
    process.exit();
  }
}

checkTable();
