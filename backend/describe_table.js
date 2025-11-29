const db = require('./config/database');

async function describeTable() {
    try {
        const [rows] = await db.query('DESCRIBE animals_or_batches');
        console.log(rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

describeTable();
