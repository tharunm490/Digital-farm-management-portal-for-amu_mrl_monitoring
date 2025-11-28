const db = require('./config/database');

async function debugStats() {
    try {
        const statsQuery = `
      SELECT 
        COUNT(DISTINCT f.farm_id) as total_farms,
        COUNT(DISTINCT e.entity_id) as total_entities,
        COUNT(DISTINCT tr.treatment_id) as total_treatments,
        COUNT(DISTINCT CASE WHEN amu.risk_category = 'unsafe' THEN amu.amu_id END) as unsafe_treatments,
        COUNT(DISTINCT CASE WHEN amu.risk_category = 'borderline' THEN amu.amu_id END) as borderline_treatments,
        COUNT(DISTINCT CASE WHEN mrl.risk_percent > 100 THEN mrl.amu_id END) as mrl_violations,
        COUNT(DISTINCT fr.farmer_id) as total_farmers
      FROM farms f
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN animals_or_batches e ON f.farm_id = e.farm_id
      LEFT JOIN treatment_records tr ON e.entity_id = tr.entity_id
      LEFT JOIN amu_records amu ON tr.treatment_id = amu.treatment_id
      LEFT JOIN amu_tissue_results mrl ON amu.amu_id = mrl.amu_id
      WHERE 1=1
    `;

        console.log('Running query...');
        const [stats] = await db.execute(statsQuery);
        console.log('Stats:', stats[0]);

        // Debug individual counts
        const [farms] = await db.query('SELECT COUNT(*) as c FROM farms');
        console.log('Total Farms (Direct):', farms[0].c);

        const [farmers] = await db.query('SELECT COUNT(*) as c FROM farmers');
        console.log('Total Farmers (Direct):', farmers[0].c);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugStats();
