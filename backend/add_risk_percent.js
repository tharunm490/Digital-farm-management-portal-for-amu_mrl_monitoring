const db = require('./config/database');

async function addRiskPercent() {
    try {
        console.log('Checking for risk_percent column...');

        const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'amu_records'
      AND COLUMN_NAME = 'risk_percent'
    `);

        if (columns.length === 0) {
            console.log('Adding risk_percent column...');
            await db.query(`
        ALTER TABLE amu_records 
        ADD COLUMN risk_percent DECIMAL(5,2)
      `);
            console.log('✅ Successfully added risk_percent column');
        } else {
            console.log('✅ risk_percent column already exists');
        }

        // Also check for worst_tissue column (used in Treatment.js line 382)
        const [tissueCol] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'amu_records'
      AND COLUMN_NAME = 'worst_tissue'
    `);

        if (tissueCol.length === 0) {
            console.log('Adding worst_tissue column...');
            await db.query(`
        ALTER TABLE amu_records 
        ADD COLUMN worst_tissue VARCHAR(50)
      `);
            console.log('✅ Successfully added worst_tissue column');
        } else {
            console.log('✅ worst_tissue column already exists');
        }

        console.log('\n✅ All columns added successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

addRiskPercent();
