const db = require('./config/database');

async function checkAndFix() {
    try {
        console.log('Checking dose_unit columns...\n');

        // Check treatment_records
        const [tCols] = await db.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'treatment_records'
      AND COLUMN_NAME = 'dose_unit'
    `);
        console.log('treatment_records.dose_unit:', tCols[0]?.COLUMN_TYPE);

        // Check amu_records
        const [aCols] = await db.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'amu_records'
      AND COLUMN_NAME = 'dose_unit'
    `);
        console.log('amu_records.dose_unit:', aCols[0]?.COLUMN_TYPE);

        // Force fix
        console.log('\nApplying fixes...');
        await db.query(`ALTER TABLE treatment_records MODIFY COLUMN dose_unit VARCHAR(100)`);
        await db.query(`ALTER TABLE amu_records MODIFY COLUMN dose_unit VARCHAR(100)`);
        console.log('✅ Altered both tables to VARCHAR(100)');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAndFix();
