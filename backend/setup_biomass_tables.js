require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupBiomassTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'farm_management'
  });

  try {
    console.log('📊 Setting up Biomass Analytics Tables...\n');

    // Create species_avg_weights table
    console.log('1️⃣ Creating species_avg_weights table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS species_avg_weights (
        species ENUM('cattle','goat','sheep','pig','poultry') PRIMARY KEY,
        avg_weight_kg DOUBLE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table created\n');

    // Insert default weights
    console.log('2️⃣ Inserting default species weights...');
    await connection.execute(`
      INSERT IGNORE INTO species_avg_weights (species, avg_weight_kg) VALUES
      ('cattle', 350),
      ('goat', 40),
      ('sheep', 55),
      ('pig', 120),
      ('poultry', 2)
    `);
    console.log('✅ Default weights inserted\n');

    // Verify
    console.log('3️⃣ Verifying data...');
    const [rows] = await connection.execute('SELECT * FROM species_avg_weights');
    console.table(rows);

    console.log('\n🎉 Biomass tables setup complete!');

  } catch (error) {
    console.error('❌ Error setting up tables:', error.message);
  } finally {
    await connection.end();
  }
}

setupBiomassTables();
