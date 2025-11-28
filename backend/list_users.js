const db = require('./config/database');

async function checkUsers() {
    try {
        const [users] = await db.query('SELECT user_id, email, role FROM users');
        console.log('Users found:', users);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUsers();
