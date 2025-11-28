const db = require('./config/database');

async function checkUser() {
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE email = 'newvet@test.com'");
        console.log('User found:', rows);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUser();
