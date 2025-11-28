const db = require('./config/database');

async function addVaccId() {
    try {
        console.log('Adding vacc_id column to notifications...');

        const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'notifications'
      AND COLUMN_NAME = 'vacc_id'
    `);

        if (columns.length === 0) {
            await db.query(`
        ALTER TABLE notifications 
        ADD COLUMN vacc_id INT
      `);
            console.log('✅ Added vacc_id column');
        } else {
            console.log('✅ vacc_id column already exists');
        }

        console.log('\n✅ Schema fix complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

addVaccId();
