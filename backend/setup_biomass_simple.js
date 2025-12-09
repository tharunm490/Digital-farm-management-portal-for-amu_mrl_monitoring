require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupBiomassTable() {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('✅ Connected to database');
    
    // Check if table exists
    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'species_avg_weights'
    `, [process.env.DB_NAME]);

    if (tables.length > 0) {
      console.log('✅ species_avg_weights table already exists');
      
      const [rows] = await connection.query('SELECT * FROM species_avg_weights ORDER BY species');
      console.log('\n📊 Current species weights:');
      rows.forEach(row => {
        console.log(`   ${row.species}: ${row.avg_weight_kg} kg`);
      });
      
      if (rows.length === 0) {
        console.log('\n⚠️  Table is empty. Inserting default weights...');
        await insertWeights(connection);
      }
    } else {
      console.log('❌ Table does not exist. Creating...');
      
      await connection.query(`
        CREATE TABLE species_avg_weights (
          species ENUM('cattle','goat','sheep','pig','poultry') PRIMARY KEY,
          avg_weight_kg DOUBLE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ Table created');
      await insertWeights(connection);
    }
    
    console.log('\n✨ Biomass table setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

async function insertWeights(connection) {
  await connection.query(`
    INSERT INTO species_avg_weights (species, avg_weight_kg) 
    VALUES 
      ('cattle', 350),
      ('goat', 40),
      ('sheep', 55),
      ('pig', 120),
      ('poultry', 2)
    ON DUPLICATE KEY UPDATE avg_weight_kg = VALUES(avg_weight_kg)
  `);
  
  console.log('✅ Default weights inserted:');
  console.log('   - Cattle: 350 kg');
  console.log('   - Goat: 40 kg');
  console.log('   - Sheep: 55 kg');
  console.log('   - Pig: 120 kg');
  console.log('   - Poultry: 2 kg');
}

setupBiomassTable();
