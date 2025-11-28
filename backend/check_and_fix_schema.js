const db = require('./config/database');

async function checkAndFixSchema() {
    try {
        console.log('Checking amu_records table schema...\n');

        // Check current columns in amu_records
        const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'amu_records'
      ORDER BY ORDINAL_POSITION
    `);

        console.log('Current columns in amu_records:');
        columns.forEach(col => console.log('  -', col.COLUMN_NAME));

        const hasOverdosage = columns.some(col => col.COLUMN_NAME === 'overdosage');

        if (!hasOverdosage) {
            console.log('\n❌ overdosage column is MISSING');
            console.log('Adding overdosage column...');

            await db.query(`
        ALTER TABLE amu_records 
        ADD COLUMN overdosage TINYINT(1) DEFAULT 0
      `);

            console.log('✅ Successfully added overdosage column');
        } else {
            console.log('\n✅ overdosage column exists');
        }

        // Check notifications table
        console.log('\n\nChecking notifications table...');
        const [notifCheck] = await db.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'notifications'
    `);

        if (notifCheck[0].count > 0) {
            console.log('✅ notifications table exists');

            // Check for any notifications
            const [notifCount] = await db.query('SELECT COUNT(*) as count FROM notifications');
            console.log(`   Found ${notifCount[0].count} notifications`);
        } else {
            console.log('❌ notifications table does NOT exist');
        }

        // Check AMU records
        console.log('\n\nChecking AMU records...');
        const [amuCount] = await db.query('SELECT COUNT(*) as count FROM amu_records');
        console.log(`Found ${amuCount[0].count} AMU records`);

        if (amuCount[0].count > 0) {
            const [sample] = await db.query('SELECT * FROM amu_records LIMIT 1');
            console.log('\nSample AMU record columns:', Object.keys(sample[0]));
        }

        console.log('\n✅ Schema check complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
        process.exit(1);
    }
}

checkAndFixSchema();
