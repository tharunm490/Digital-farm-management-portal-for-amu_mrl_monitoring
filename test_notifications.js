const db = require('./backend/config/database');
const Notification = require('./backend/models/Notification');

async function testNotifications() {
  console.log('🧪 Testing all notification ENUM values...\n');

  const testCases = [
    { name: 'Sample Collection', type: 'alert', subtype: null },
    { name: 'Unsafe MRL Alert', type: 'alert', subtype: 'unsafe_mrl' },
    { name: 'Test Completed Safe', type: 'alert', subtype: null },
    { name: 'Lab Assignment', type: 'alert', subtype: null },
    { name: 'High Dosage Alert', type: 'alert', subtype: 'high_dosage' },
    { name: 'Overdosage Alert', type: 'alert', subtype: 'overdosage' },
    { name: 'Vaccination Reminder', type: 'vaccination', subtype: null }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    try {
      const notificationId = await Notification.create({
        user_id: 1,
        type: test.type,
        subtype: test.subtype,
        message: `Test: ${test.name}`,
        entity_id: null,
        treatment_id: null
      });
      console.log(`✅ ${test.name}: type='${test.type}', subtype=${test.subtype === null ? 'NULL' : `'${test.subtype}'`} - PASSED (ID: ${notificationId})`);
      passed++;
    } catch (error) {
      console.error(`❌ ${test.name}: type='${test.type}', subtype='${test.subtype}' - FAILED`);
      console.error(`   Error: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('🎉 All notification ENUM values are valid!');
  } else {
    console.log('⚠️ Some notifications still have invalid ENUM values.');
  }

  process.exit(failed === 0 ? 0 : 1);
}

testNotifications().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
