const db = require('../config/database');

async function updateSchema() {
    try {
        console.log('🔄 Updating database schema...');

        // Create drug_master table
        await db.execute(`
      CREATE TABLE IF NOT EXISTS drug_master (
        drug_id INT AUTO_INCREMENT PRIMARY KEY,
        drug_name VARCHAR(255) NOT NULL,
        active_ingredient VARCHAR(255) NOT NULL,
        drug_class VARCHAR(100),
        who_criticality ENUM('critically_important', 'highly_important', 'important') NOT NULL DEFAULT 'important',
        banned_for_food_animals BOOLEAN DEFAULT FALSE,
        common_indications TEXT,
        side_effects TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_drug (drug_name, active_ingredient)
      )
    `);
        console.log('✅ Created drug_master table');

        // Create mrl_reference table
        await db.execute(`
      CREATE TABLE IF NOT EXISTS mrl_reference (
        mrl_id INT AUTO_INCREMENT PRIMARY KEY,
        drug_id INT NOT NULL,
        species ENUM('cattle','goat','sheep','pig','poultry') NOT NULL,
        matrix ENUM('milk','meat','egg') NOT NULL,
        mrl_value_ppb DOUBLE NOT NULL,
        mrl_value_ppm DOUBLE,
        withdrawal_days INT NOT NULL,
        source ENUM('codex','fssai','woah','other') NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (drug_id) REFERENCES drug_master(drug_id) ON DELETE CASCADE,
        UNIQUE KEY unique_mrl (drug_id, species, matrix, source)
      )
    `);
        console.log('✅ Created mrl_reference table');

        console.log('✅ Schema update completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating schema:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    updateSchema();
}

module.exports = { updateSchema };
