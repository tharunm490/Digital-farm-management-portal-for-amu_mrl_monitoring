const db = require('./config/database');

async function describeFarms() {
    try {
        const [rows] = await db.query('DESCRIBE farms');
        console.log(rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

describeFarms();
