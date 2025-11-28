const db = require('./config/database');

async function fixSchema() {
    try {
        console.log('Starting schema fixes...');

        // Check and add overdosage column to amu_records if missing
        try {
            await db.query(`
        ALTER TABLE amu_records 
        ADD COLUMN IF NOT EXISTS overdosage BOOLEAN DEFAULT FALSE
      `);
            console.log('✓ Added overdosage column to amu_records');
        } catch (err) {
            if (err.message.includes('Duplicate column')) {
                console.log('✓ overdosage column already exists');
            } else {
                console.error('Error adding overdosage column:', err.message);
            }
        }

        // Check and add subtype column to notifications if missing
        try {
            await db.query(`
        ALTER TABLE notifications 
        ADD COLUMN IF NOT EXISTS subtype VARCHAR(50)
      `);
            console.log('✓ Added subtype column to notifications');
        } catch (err) {
            if (err.message.includes('Duplicate column')) {
                console.log('✓ subtype column already exists');
            } else {
                console.error('Error adding subtype column:', err.message);
            }
        }

        console.log('\n✅ Schema fixes completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Schema fix failed:', err);
        process.exit(1);
    }
}

fixSchema();
