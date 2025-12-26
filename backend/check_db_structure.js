const db = require('./config/database');

async function checkDatabaseStructure() {
    try {
        console.log('\n=== CHECKING DATABASE STRUCTURE ===\n');

        // Show all tables
        const [tables] = await db.query('SHOW TABLES');
        console.log('Available Tables:');
        console.table(tables);

        // Check each table that exists
        for (const tableObj of tables) {
            const tableName = Object.values(tableObj)[0];

            try {
                const [count] = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                console.log(`\n${tableName}: ${count[0].count} records`);

                // Show sample data if exists
                if (count[0].count > 0 && count[0].count <= 10) {
                    const [data] = await db.query(`SELECT * FROM ${tableName} LIMIT 5`);
                    console.table(data);
                } else if (count[0].count > 0) {
                    const [data] = await db.query(`SELECT * FROM ${tableName} LIMIT 3`);
                    console.table(data);
                }
            } catch (err) {
                console.error(`Error querying ${tableName}:`, err.message);
            }
        }

        console.log('\n=== DATABASE STRUCTURE CHECK COMPLETE ===\n');
        process.exit(0);
    } catch (error) {
        console.error('Error checking database structure:', error);
        process.exit(1);
    }
}

checkDatabaseStructure();
