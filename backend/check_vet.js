const db = require('./config/database');

async function checkVet() {
    try {
        const [vets] = await db.query('SELECT * FROM veterinarians');
        console.log('Veterinarians:', vets);

        if (vets.length === 0) {
            console.log('No vets found! Creating one...');
            // Need a user first
            const [users] = await db.query("SELECT user_id FROM users WHERE role='veterinarian' LIMIT 1");
            let userId;
            if (users.length > 0) {
                userId = users[0].user_id;
            } else {
                // Create user
                const [res] = await db.query("INSERT INTO users (email, password_hash, role, auth_provider) VALUES ('vet_seed@test.com', 'hash', 'veterinarian', 'local')");
                userId = res.insertId;
            }

            const [vetRes] = await db.query("INSERT INTO veterinarians (user_id, vet_name, license_number) VALUES (?, 'Dr. Seed', 'VET123')", [userId]);
            console.log('Created Vet ID:', vetRes.insertId);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkVet();
