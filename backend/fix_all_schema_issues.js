const db = require('./config/database');

async function fixAllSchemaIssues() {
    try {
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║          COMPREHENSIVE SCHEMA FIX                          ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        // 1. Check dose_unit column size in treatment_records
        console.log('1. Checking dose_unit column in treatment_records...');
        const [doseUnitCol] = await db.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'treatment_records'
      AND COLUMN_NAME = 'dose_unit'
    `);

        if (doseUnitCol.length > 0) {
            console.log('   Current type:', doseUnitCol[0].COLUMN_TYPE);
            if (doseUnitCol[0].COLUMN_TYPE.includes('varchar') && !doseUnitCol[0].COLUMN_TYPE.includes('(50)')) {
                console.log('   Expanding dose_unit to VARCHAR(50)...');
                await db.query(`ALTER TABLE treatment_records MODIFY COLUMN dose_unit VARCHAR(50)`);
                console.log('   ✅ Fixed dose_unit column size');
            } else {
                console.log('   ✅ dose_unit size is OK');
            }
        }

        // 2. Check dose_unit in amu_records
        console.log('\n2. Checking dose_unit column in amu_records...');
        const [amuDoseUnit] = await db.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'amu_records'
      AND COLUMN_NAME = 'dose_unit'
    `);

        if (amuDoseUnit.length > 0) {
            console.log('   Current type:', amuDoseUnit[0].COLUMN_TYPE);
            if (amuDoseUnit[0].COLUMN_TYPE.includes('varchar') && !amuDoseUnit[0].COLUMN_TYPE.includes('(50)')) {
                console.log('   Expanding dose_unit to VARCHAR(50)...');
                await db.query(`ALTER TABLE amu_records MODIFY COLUMN dose_unit VARCHAR(50)`);
                console.log('   ✅ Fixed dose_unit column size');
            } else {
                console.log('   ✅ dose_unit size is OK');
            }
        }

        // 3. Verify all critical columns exist
        console.log('\n3. Verifying all critical columns...');
        const criticalColumns = [
            { table: 'amu_records', column: 'overdosage', type: 'TINYINT(1)' },
            { table: 'amu_records', column: 'risk_percent', type: 'DECIMAL(5,2)' },
            { table: 'amu_records', column: 'worst_tissue', type: 'VARCHAR(50)' },
            { table: 'notifications', column: 'subtype', type: 'VARCHAR(50)' },
            { table: 'notifications', column: 'vacc_id', type: 'INT' }
        ];

        for (const col of criticalColumns) {
            const [exists] = await db.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND COLUMN_NAME = ?
      `, [col.table, col.column]);

            if (exists.length === 0) {
                console.log(`   ❌ Missing: ${col.table}.${col.column}`);
                console.log(`      Adding ${col.column}...`);
                await db.query(`ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.type}`);
                console.log(`      ✅ Added ${col.column}`);
            } else {
                console.log(`   ✅ ${col.table}.${col.column} exists`);
            }
        }

        // 4. Check if notification_history table exists (might be causing confusion)
        console.log('\n4. Checking for notification_history table...');
        const [notifHistory] = await db.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'notification_history'
    `);

        if (notifHistory[0].count > 0) {
            console.log('   ⚠️  notification_history table exists (should use notifications instead)');
        } else {
            console.log('   ✅ No conflicting notification_history table');
        }

        // 5. Test data insertion
        console.log('\n5. Testing if we can query tables...');
        const [amuCount] = await db.query('SELECT COUNT(*) as count FROM amu_records');
        console.log('   ✅ AMU records table accessible, count:', amuCount[0].count);

        const [notifCount] = await db.query('SELECT COUNT(*) as count FROM notifications');
        console.log('   ✅ Notifications table accessible, count:', notifCount[0].count);

        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║          ALL SCHEMA FIXES COMPLETE ✅                      ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        process.exit(0);
    } catch (err) {
        console.error('\n❌ Error:', err.message);
        console.error(err);
        process.exit(1);
    }
}

fixAllSchemaIssues();
