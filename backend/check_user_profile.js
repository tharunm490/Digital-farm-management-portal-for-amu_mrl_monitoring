const db = require('./config/database');

async function checkUserProfile() {
    try {
        const email = 'yashasbrbtech24@rvu.edu.in';
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            console.log('User not found');
            process.exit(0);
        }

        const user = users[0];
        console.log('User:', user);

        if (user.role === 'farmer') {
            const [farmers] = await db.query('SELECT * FROM farmers WHERE user_id = ?', [user.user_id]);
            console.log('Farmer Profile:', farmers[0]);
        } else {
            console.log('User is not a farmer, role:', user.role);
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkUserProfile();
