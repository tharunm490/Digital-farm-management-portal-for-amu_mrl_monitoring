const db = require('./config/database');

async function createTissueResultsTable() {
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS amu_tissue_results (
        tissue_result_id INT PRIMARY KEY AUTO_INCREMENT,
        amu_id INT NOT NULL,
        tissue VARCHAR(50) NOT NULL,
        predicted_mrl DECIMAL(10,2),
        base_mrl DECIMAL(10,2),
        risk_percent DECIMAL(5,2),
        risk_category VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (amu_id) REFERENCES amu_records(amu_id) ON DELETE CASCADE
      )
    `);
        console.log('✅ Created amu_tissue_results table');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

createTissueResultsTable();
