const db = require('./config/database');

async function checkDatabaseData() {
    try {
        console.log('\n=== CHECKING DATABASE DATA ===\n');

        // Check farmers table
        console.log('--- FARMERS TABLE ---');
        const [farmerCount] = await db.query('SELECT COUNT(*) as count FROM farmers');
        console.log(`Total Farmers: ${farmerCount[0].count}`);

        if (farmerCount[0].count > 0) {
            const [farmers] = await db.query('SELECT * FROM farmers LIMIT 5');
            console.log('\nFirst 5 Farmers:');
            console.table(farmers);
        }

        // Check veterinarians table
        console.log('\n--- VETERINARIANS TABLE ---');
        const [vetCount] = await db.query('SELECT COUNT(*) as count FROM veterinarians');
        console.log(`Total Veterinarians: ${vetCount[0].count}`);

        if (vetCount[0].count > 0) {
            const [vets] = await db.query('SELECT * FROM veterinarians LIMIT 5');
            console.log('\nFirst 5 Veterinarians:');
            console.table(vets);
        }

        // Check users table
        console.log('\n--- USERS TABLE ---');
        const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
        console.log(`Total Users: ${userCount[0].count}`);

        const [usersByRole] = await db.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
        console.log('\nUsers by Role:');
        console.table(usersByRole);

        if (userCount[0].count > 0) {
            const [users] = await db.query('SELECT user_id, email, role, created_at FROM users LIMIT 10');
            console.log('\nFirst 10 Users:');
            console.table(users);
        }

        // Check farms table
        console.log('\n--- FARMS TABLE ---');
        const [farmCount] = await db.query('SELECT COUNT(*) as count FROM farms');
        console.log(`Total Farms: ${farmCount[0].count}`);

        if (farmCount[0].count > 0) {
            const [farms] = await db.query('SELECT * FROM farms LIMIT 5');
            console.log('\nFirst 5 Farms:');
            console.table(farms);
        }

        // Check animals table
        console.log('\n--- ANIMALS TABLE ---');
        const [animalCount] = await db.query('SELECT COUNT(*) as count FROM animals');
        console.log(`Total Animals: ${animalCount[0].count}`);

        if (animalCount[0].count > 0) {
            const [animals] = await db.query('SELECT * FROM animals LIMIT 5');
            console.log('\nFirst 5 Animals:');
            console.table(animals);
        }

        // Check treatments table
        console.log('\n--- TREATMENTS TABLE ---');
        const [treatmentCount] = await db.query('SELECT COUNT(*) as count FROM treatments');
        console.log(`Total Treatments: ${treatmentCount[0].count}`);

        if (treatmentCount[0].count > 0) {
            const [treatments] = await db.query('SELECT * FROM treatments LIMIT 5');
            console.log('\nFirst 5 Treatments:');
            console.table(treatments);
        }

        // Check amu_records table
        console.log('\n--- AMU RECORDS TABLE ---');
        const [amuCount] = await db.query('SELECT COUNT(*) as count FROM amu_records');
        console.log(`Total AMU Records: ${amuCount[0].count}`);

        if (amuCount[0].count > 0) {
            const [amuRecords] = await db.query('SELECT * FROM amu_records LIMIT 5');
            console.log('\nFirst 5 AMU Records:');
            console.table(amuRecords);
        }

        console.log('\n=== DATABASE CHECK COMPLETE ===\n');
        process.exit(0);
    } catch (error) {
        console.error('Error checking database:', error);
        process.exit(1);
    }
}

checkDatabaseData();
