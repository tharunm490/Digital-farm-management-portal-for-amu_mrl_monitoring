const db = require('./config/database');

async function fixConstraint() {
  try {
    console.log('Fixing users_chk_1 constraint to include laboratory role...');
    
    // Drop the old constraint
    await db.query('ALTER TABLE users DROP CHECK users_chk_1');
    console.log('✅ Dropped old constraint');
    
    // Add the new constraint that includes laboratory
    await db.query(`
      ALTER TABLE users ADD CONSTRAINT users_chk_1 CHECK (
        (role = 'farmer' AND aadhaar_number IS NOT NULL AND phone IS NOT NULL) OR
        (role IN ('authority', 'veterinarian', 'distributor', 'laboratory') AND auth_provider IS NOT NULL)
      )
    `);
    console.log('✅ Added new constraint with laboratory role');
    
    console.log('\n✅ Constraint fix complete!');
    console.log('Now laboratory users can be created with Google auth.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

fixConstraint();
