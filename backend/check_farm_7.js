const db = require('./config/database');

async function checkFarm() {
    try {
        const [farms] = await db.query('SELECT * FROM farms WHERE farm_id = 7');
        console.log('Farm 7:', farms);

        if (farms.length > 0) {
            const farmerId = farms[0].farmer_id;
            console.log('Farmer ID:', farmerId);

            const [farmers] = await db.query('SELECT * FROM farmers WHERE farmer_id = ?', [farmerId]);
            console.log('Farmer:', farmers);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkFarm();
