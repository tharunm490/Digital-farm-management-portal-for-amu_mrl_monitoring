const mysql = require('mysql2/promise');
const dbConfig = require('./config/database').pool.config.connectionConfig;

async function createTable() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database
        });

        const query = `
      CREATE TABLE IF NOT EXISTS farm_amu_metrics (
        metric_id INT AUTO_INCREMENT PRIMARY KEY,
        farm_id INT NOT NULL,
        risk_score DECIMAL(5,2),
        risk_level ENUM('low', 'medium', 'high', 'critical'),
        unsafe_records INT DEFAULT 0,
        borderline_records INT DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (farm_id) REFERENCES farms(farm_id),
        UNIQUE KEY unique_farm_metric (farm_id)
      );
    `;

        await connection.execute(query);
        console.log('Table farm_amu_metrics created successfully.');

    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        if (connection) await connection.end();
    }
}

createTable();
