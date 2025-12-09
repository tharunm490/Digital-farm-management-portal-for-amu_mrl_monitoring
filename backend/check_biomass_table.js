require('dotenv').config();
const db = require('./config/database');

async function checkAndCreateBiomassTable() {
  try {
    console.log('🔍 Checking if species_avg_weights table exists...');
    
    // Check if table exists
    const [tables] = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'species_avg_weights'
    `, [process.env.DB_NAME || 'railway']);

    if (tables.length > 0) {
      console.log('✅ species_avg_weights table already exists');
      
      // Show existing data
      const [rows] = await db.query('SELECT * FROM species_avg_weights');
      console.log('\n📊 Current species weights:');
      console.table(rows);
      
      if (rows.length === 0) {
        console.log('\n⚠️  Table exists but is empty. Inserting default weights...');
        await insertDefaultWeights();
      }
    } else {
      console.log('❌ species_avg_weights table does not exist');
      console.log('🔨 Creating table...');
      
      await db.query(`
        CREATE TABLE species_avg_weights (
          species ENUM('cattle','goat','sheep','pig','poultry') PRIMARY KEY,
          avg_weight_kg DOUBLE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ Table created successfully');
      await insertDefaultWeights();
    }
    
    console.log('\n✨ Setup complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function insertDefaultWeights() {
  try {
    await db.query(`
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
  } catch (error) {
    console.error('❌ Error inserting weights:', error.message);
    throw error;
  }
}

checkAndCreateBiomassTable();
