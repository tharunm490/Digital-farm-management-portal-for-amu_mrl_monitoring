const db = require('./config/database');

async function cleanup() {
  try {
    console.log('🧹 Cleaning up test data...');
    
    // Delete in reverse order of foreign key dependencies
    await db.execute(`DELETE FROM amu_records WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'farmer%@example.com')`);
    await db.execute(`DELETE FROM treatment_records WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'farmer%@example.com')`);
    await db.execute(`DELETE FROM vet_farm_mapping WHERE vet_id = 'VET12345'`);
    await db.execute(`DELETE FROM animals_or_batches WHERE farm_id IN (SELECT farm_id FROM farms WHERE farmer_id IN (SELECT farmer_id FROM farmers WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'farmer%@example.com')))`);
    await db.execute(`DELETE FROM farms WHERE farmer_id IN (SELECT farmer_id FROM farmers WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'farmer%@example.com'))`);
    await db.execute(`DELETE FROM farmers WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE 'farmer%@example.com')`);
    await db.execute(`DELETE FROM veterinarians WHERE user_id IN (SELECT user_id FROM users WHERE email = 'vet@example.com')`);
    await db.execute(`DELETE FROM users WHERE email LIKE 'farmer%@example.com' OR email = 'vet@example.com' OR email = 'authority@example.com'`);
    
    console.log('✅ Cleanup completed!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await db.end();
    process.exit();
  }
}

cleanup();
