const db = require('./config/database');

async function checkConstraint() {
  try {
    const [constraints] = await db.query(`
      SELECT CONSTRAINT_NAME, CHECK_CLAUSE 
      FROM information_schema.CHECK_CONSTRAINTS 
      WHERE CONSTRAINT_SCHEMA = 'd' 
      AND CONSTRAINT_NAME = 'users_chk_1'
    `);
    
    console.log('Constraint details:', constraints);
    
    // Also check the table structure
    const [columns] = await db.query(`
      DESCRIBE users
    `);
    
    console.log('\nUsers table structure:');
    console.table(columns);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
    process.exit();
  }
}

checkConstraint();
