const db = require('./config/database');

(async () => {
    try {
        const [rows] = await db.execute('DESCRIBE farms');
        console.log('Farms table columns:');
        rows.forEach(r => console.log(`  - ${r.Field} (${r.Type})`));
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
