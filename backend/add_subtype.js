const db = require('./config/database');

async function addSubtypeColumn() {
    try {
        // Check if subtype column exists
        const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'notifications' 
      AND COLUMN_NAME = 'subtype'
    `);

        if (columns.length === 0) {
            // Column doesn't exist, add it
            await db.query(`
        ALTER TABLE notifications 
        ADD COLUMN subtype VARCHAR(50)
      `);
            console.log('✓ Added subtype column to notifications');
        } else {
            console.log('✓ subtype column already exists');
        }

        console.log('\n✅ Schema fix completed!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

addSubtypeColumn();
