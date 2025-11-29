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
      CREATE TABLE IF NOT EXISTS compliance_alerts (
        alert_id INT AUTO_INCREMENT PRIMARY KEY,
        farm_id INT NOT NULL,
        alert_type VARCHAR(50),
        alert_message TEXT,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farm_id) REFERENCES farms(farm_id)
      );
    `;

        await connection.execute(query);
        console.log('Table compliance_alerts created successfully.');

    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        if (connection) await connection.end();
    }
}

createTable();
