const db = require('./config/database');

(async () => {
  try {
    console.log('Checking notification_history table structure...\n');
    
    const [cols] = await db.execute('DESCRIBE notification_history');
    
    const typeCol = cols.find(c => c.Field === 'type');
    const subtypeCol = cols.find(c => c.Field === 'subtype');
    
    console.log('TYPE column:');
    console.log('  Type:', typeCol.Type);
    console.log('  Null:', typeCol.Null);
    console.log('  Default:', typeCol.Default);
    
    console.log('\nSUBTYPE column:');
    console.log('  Type:', subtypeCol.Type);
    console.log('  Null:', subtypeCol.Null);
    console.log('  Default:', subtypeCol.Default);
    
    // Test insert with problematic values
    console.log('\nTesting problematic values...');
    
    try {
      await db.execute(`
        INSERT INTO notification_history (user_id, type, subtype, message)
        VALUES (4, 'alert', 'safe_date_reached', 'Test message')
      `);
      console.log('✅ INSERT with type=alert, subtype=safe_date_reached SUCCESS');
      
      // Clean up
      await db.execute(`DELETE FROM notification_history WHERE message = 'Test message'`);
    } catch (e) {
      console.log('❌ INSERT FAILED:', e.message);
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await db.end();
    process.exit(0);
  }
})();
