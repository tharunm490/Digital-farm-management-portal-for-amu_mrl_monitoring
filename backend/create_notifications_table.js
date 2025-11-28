const db = require('./config/database');

async function createNotificationsTable() {
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        entity_id INT,
        type VARCHAR(50) NOT NULL,
        subtype VARCHAR(50),
        title VARCHAR(255),
        message TEXT NOT NULL,
        severity ENUM('info', 'warning', 'critical') DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        treatment_id INT,
        amu_id INT,
        related_record_id INT,
        related_table VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id) ON DELETE CASCADE,
        FOREIGN KEY (treatment_id) REFERENCES treatment_records(treatment_id) ON DELETE CASCADE,
        FOREIGN KEY (amu_id) REFERENCES amu_records(amu_id) ON DELETE CASCADE
      )
    `);
        console.log('✓ Created notifications table');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

createNotificationsTable();
