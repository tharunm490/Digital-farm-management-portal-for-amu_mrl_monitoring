const db = require('./config/database');

async function checkTissueSchema() {
    try {
        const [cols] = await db.query(`DESCRIBE amu_tissue_results`);
        console.log('Columns:', cols.map(c => c.Field));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTissueSchema();
