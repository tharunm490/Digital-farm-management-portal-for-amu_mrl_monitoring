const db = require('./config/database');

async function checkRoleEnum() {
  try {
    const [result] = await db.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
    `);
    
    console.log('Role ENUM definition:', result[0].COLUMN_TYPE);
    
    // Try to insert with 'laboratory' role to see if it works
    console.log('\nTesting laboratory role insertion...');
    const testResult = await db.query(
      `INSERT INTO users (role, display_name, email, auth_provider, google_uid) 
       VALUES ('laboratory', ?, ?, 'google', ?)`,
      ['Test Lab', 'testlab@example.com', 'test_' + Date.now()]
    ).catch(e => {
      console.error('Error inserting laboratory role:', e.message);
      return null;
    });
    
    if (testResult) {
      console.log('✅ Successfully inserted laboratory role');
      // Clean up
      await db.query('DELETE FROM users WHERE display_name = ?', ['Test Lab']);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

checkRoleEnum();
