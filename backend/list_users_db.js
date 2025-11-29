const db = require('./config/database');

async function listUsers() {
    try {
        const [users] = await db.query('SELECT * FROM users');
        console.log('Users:', users);
        const [farmers] = await db.query('SELECT * FROM farmers');
        console.log('Farmers:', farmers);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listUsers();
