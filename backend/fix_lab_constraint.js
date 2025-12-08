const db = require('./config/database');

async function fixConstraint() {
  try {
    console.log('🔧 Fixing laboratory role constraint...');

    // Step 1: Drop the old constraint
    console.log('Step 1: Dropping old constraint...');
    try {
      await db.query(`
        ALTER TABLE users DROP CONSTRAINT users_chk_1
      `);
      console.log('✅ Old constraint dropped');
    } catch (e) {
      console.log('⚠️ Could not drop constraint (may not exist):', e.message);
    }

    // Step 2: Modify ENUM to include laboratory
    console.log('Step 2: Updating role ENUM...');
    await db.query(`
      ALTER TABLE users 
      MODIFY role ENUM('farmer','authority','veterinarian','distributor','laboratory') NOT NULL
    `);
    console.log('✅ Role ENUM updated');

    // Step 3: Add new CHECK constraint for laboratory role
    console.log('Step 3: Adding new CHECK constraint...');
    await db.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_chk_1 CHECK (
        (role = 'farmer' AND aadhaar_number IS NOT NULL AND phone IS NOT NULL) OR
        (role IN ('authority', 'veterinarian', 'distributor', 'laboratory') AND auth_provider IS NOT NULL)
      )
    `);
    console.log('✅ New CHECK constraint added');

    // Step 4: Verify the constraint
    console.log('Step 4: Verifying constraint...');
    const [constraints] = await db.query(`
      SELECT CONSTRAINT_NAME, CHECK_CLAUSE 
      FROM information_schema.CHECK_CONSTRAINTS 
      WHERE CONSTRAINT_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users'
    `);
    console.log('✅ Current constraints:');
    console.table(constraints);

    console.log('\n✅ ALL CHANGES COMPLETED SUCCESSFULLY');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.end();
    process.exit();
  }
}

fixConstraint();
