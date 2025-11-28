const db = require('./config/database');

async function createTable() {
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS veterinarians (
        vet_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        license_number VARCHAR(50) NOT NULL,
        phone VARCHAR(20),
        state VARCHAR(50),
        district VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);
        console.log('Veterinarians table created successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error creating table:', err);
        process.exit(1);
    }
}

createTable();
