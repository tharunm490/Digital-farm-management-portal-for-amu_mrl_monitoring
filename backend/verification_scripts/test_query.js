const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function testQuery() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database
        });

        const query = `
      SELECT 
        f.farm_id,
        f.farm_name,
        u.display_name as farmer_name,
        fr.district,
        fr.state,
        fm.risk_score,
        fm.risk_level,
        fm.unsafe_records,
        fm.borderline_records,
        COUNT(DISTINCT ca.alert_id) as active_alerts
      FROM farms f
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      JOIN users u ON fr.user_id = u.user_id
      LEFT JOIN farm_amu_metrics fm ON f.farm_id = fm.farm_id
      LEFT JOIN compliance_alerts ca ON f.farm_id = ca.farm_id AND ca.resolved = FALSE
      WHERE 1=1 AND (fm.risk_score >= 50 OR fm.risk_level IN ('high', 'critical'))
      GROUP BY f.farm_id
      ORDER BY (fm.risk_score IS NULL), fm.risk_score DESC
      LIMIT 10
    `;

        const [rows] = await connection.execute(query);
        console.log('Query successful:', rows);

    } catch (error) {
        console.error('Query failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

testQuery();
