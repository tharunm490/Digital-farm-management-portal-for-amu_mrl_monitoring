const db = require('./config/database');

async function checkLatestTreatment() {
    try {
        const [rows] = await db.query('SELECT * FROM treatment_records ORDER BY treatment_id DESC LIMIT 1');
        console.log(rows[0]);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkLatestTreatment();
