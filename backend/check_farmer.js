const db = require('./config/database');

async function checkFarmers() {
    try {
        const [farmers] = await db.query('SELECT * FROM farmers');
        console.log('Farmers:', farmers);

        if (farmers.length === 0) {
            console.log('No farmers found! Creating one for user 4 (farmer@test.com)...');
            // Assuming user_id 4 is farmer@test.com based on previous logs
            // Let's get the user_id dynamically
            const [users] = await db.query("SELECT user_id FROM users WHERE email='farmer@test.com'");
            if (users.length > 0) {
                await db.query("INSERT INTO farmers (user_id, phone, state, district) VALUES (?, '1234567890', 'Karnataka', 'Bangalore Urban')", [users[0].user_id]);
                console.log('✅ Created farmer record');
            } else {
                console.log('❌ User farmer@test.com not found');
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkFarmers();
