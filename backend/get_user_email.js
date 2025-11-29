const db = require('./config/database');

async function getUserEmail() {
    try {
        const [users] = await db.query('SELECT email FROM users WHERE user_id = 1');
        console.log('Email:', users[0].email);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

getUserEmail();
