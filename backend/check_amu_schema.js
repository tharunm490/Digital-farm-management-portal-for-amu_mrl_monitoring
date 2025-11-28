const db = require('./config/database');

async function checkSchema() {
    try {
        const [cols] = await db.query(`DESCRIBE amu_records`);
        console.log('Columns:', cols.map(c => c.Field));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
