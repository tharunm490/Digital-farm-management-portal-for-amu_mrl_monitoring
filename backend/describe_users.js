const db = require('./config/database');

async function describeUsers() {
    try {
        const [rows] = await db.query('DESCRIBE users');
        console.log(rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

describeUsers();
