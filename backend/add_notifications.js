const db = require('./config/database');

async function addNotifications() {
  try {
    console.log('Adding sample notifications for user_id 17...');

    // Add MRL alert notification
    await db.execute(`
      INSERT INTO notification_history (user_id, type, subtype, message, is_read, created_at) 
      VALUES (17, 'alert', 'unsafe_mrl', 'MRL Alert: Unsafe residue levels detected for Enrofloxacin treatment. Safe date is 2025-12-03.', false, NOW())
    `);
    console.log('Added unsafe_mrl notification');

    // Add high dosage alert notification
    await db.execute(`
      INSERT INTO notification_history (user_id, type, subtype, message, is_read, created_at) 
      VALUES (17, 'alert', 'high_dosage', 'High Dosage Alert: Treatment with Amoxicillin exceeded recommended dosage by 20%.', false, NOW())
    `);
    console.log('Added high_dosage notification');

    // Add overdosage alert notification
    await db.execute(`
      INSERT INTO notification_history (user_id, type, subtype, message, is_read, created_at) 
      VALUES (17, 'alert', 'overdosage', 'Overdosage Warning: Tetracycline dosage is above the safe limit for cattle.', false, NOW())
    `);
    console.log('Added overdosage notification');

    // Add vaccination reminder notifications
    await db.execute(`
      INSERT INTO notification_history (user_id, type, message, is_read, created_at) 
      VALUES (17, 'vaccination', 'Vaccination Reminder: Foot and Mouth Disease vaccine is due in 3 days for cattle TAG001.', false, NOW())
    `);
    console.log('Added vaccination notification 1');

    await db.execute(`
      INSERT INTO notification_history (user_id, type, message, is_read, created_at) 
      VALUES (17, 'vaccination', 'Vaccination Reminder: Brucellosis vaccine is overdue by 2 days for goat TAG003.', false, NOW())
    `);
    console.log('Added vaccination notification 2');

    console.log('\n✅ All notifications added successfully for user_id 17!');
    console.log('Refresh the notifications page in the frontend to see them.');

  } catch (error) {
    console.error('Error adding notifications:', error.message);
  } finally {
    process.exit();
  }
}

addNotifications();
