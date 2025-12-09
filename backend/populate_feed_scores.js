require('dotenv').config();
const mysql = require('mysql2/promise');

const cattleFeeds = [
  { feed_item: 'Lucerne / Alfalfa Green', cp_score: 1, tdn_score: 0.75, digestibility_score: 1, mineral_score: 1, fni: 0.925 },
  { feed_item: 'Cowpea Green Fodder', cp_score: 1, tdn_score: 0.75, digestibility_score: 1, mineral_score: 1, fni: 0.925 },
  { feed_item: 'Maize Grain', cp_score: 0.5, tdn_score: 1, digestibility_score: 0.8, mineral_score: 1, fni: 0.79 },
  { feed_item: 'Groundnut Cake', cp_score: 1, tdn_score: 0.75, digestibility_score: 0.9, mineral_score: 1, fni: 0.89 },
  { feed_item: 'Soybean Meal', cp_score: 1, tdn_score: 0.75, digestibility_score: 0.9, mineral_score: 1, fni: 0.89 },
  { feed_item: 'Wheat Bran', cp_score: 0.75, tdn_score: 0.75, digestibility_score: 0.6, mineral_score: 1, fni: 0.75 },
  { feed_item: 'Rice Bran', cp_score: 0.5, tdn_score: 0.5, digestibility_score: 0.6, mineral_score: 1, fni: 0.6 },
  { feed_item: 'Molasses', cp_score: 0.05, tdn_score: 0.75, digestibility_score: 0.8, mineral_score: 1, fni: 0.57 },
  { feed_item: 'Oat Green Fodder', cp_score: 0.5, tdn_score: 0.75, digestibility_score: 0.9, mineral_score: 1, fni: 0.74 },
  { feed_item: 'Napier / Bajra Hybrid', cp_score: 0.5, tdn_score: 0.75, digestibility_score: 0.8, mineral_score: 1, fni: 0.71 },
  { feed_item: 'Maize Stover', cp_score: 0.05, tdn_score: 0.5, digestibility_score: 0.4, mineral_score: 1, fni: 0.37 },
  { feed_item: 'Sorghum Stover', cp_score: 0.05, tdn_score: 0.25, digestibility_score: 0.4, mineral_score: 1, fni: 0.38 },
  { feed_item: 'Rice Straw', cp_score: 0.05, tdn_score: 0.25, digestibility_score: 0.35, mineral_score: 1, fni: 0.32 },
  { feed_item: 'Wheat Straw', cp_score: 0.05, tdn_score: 0.25, digestibility_score: 0.35, mineral_score: 1, fni: 0.32 },
  { feed_item: 'Mineral Mixture (Cattle)', cp_score: 0, tdn_score: 0, digestibility_score: 0, mineral_score: 1, fni: 0.25 }
];

const poultryFeeds = [
  { feed_item: 'Soybean Meal (Poultry)', cp_score: 1, tdn_score: 0.9, digestibility_score: 0.9, mineral_score: 1, fni: 0.9 },
  { feed_item: 'Groundnut Cake (Poultry)', cp_score: 0.9, tdn_score: 0.75, digestibility_score: 0.85, mineral_score: 1, fni: 0.86 },
  { feed_item: 'Distiller\'s Solubles (DDGS)', cp_score: 0.8, tdn_score: 0.75, digestibility_score: 0.75, mineral_score: 1, fni: 0.79 },
  { feed_item: 'Maize Grain (Poultry)', cp_score: 0.5, tdn_score: 1, digestibility_score: 0.95, mineral_score: 1, fni: 0.78 },
  { feed_item: 'Broken Rice / Rice Polish', cp_score: 0.4, tdn_score: 0.75, digestibility_score: 0.8, mineral_score: 1, fni: 0.69 },
  { feed_item: 'Wheat Grain (Poultry)', cp_score: 0.5, tdn_score: 0.9, digestibility_score: 0.8, mineral_score: 1, fni: 0.75 },
  { feed_item: 'Sunflower Meal', cp_score: 0.75, tdn_score: 0.65, digestibility_score: 0.7, mineral_score: 1, fni: 0.7 },
  { feed_item: 'Fish Meal', cp_score: 1, tdn_score: 0.85, digestibility_score: 0.95, mineral_score: 1, fni: 0.92 },
  { feed_item: 'Molasses (Poultry)', cp_score: 0.05, tdn_score: 0.6, digestibility_score: 0.7, mineral_score: 1, fni: 0.48 },
  { feed_item: 'Fine Chopped Green Leaf Meal', cp_score: 0.4, tdn_score: 0.35, digestibility_score: 0.3, mineral_score: 1, fni: 0.41 },
  { feed_item: 'Oat / Barley Grain (ground)', cp_score: 0.35, tdn_score: 0.55, digestibility_score: 0.65, mineral_score: 1, fni: 0.55 },
  { feed_item: 'Coarse Fodder / Straw (Poultry)', cp_score: 0.05, tdn_score: 0.1, digestibility_score: 0.05, mineral_score: 1, fni: 0.09 },
  { feed_item: 'Silage / Stover (Poultry)', cp_score: 0.05, tdn_score: 0.1, digestibility_score: 0.05, mineral_score: 1, fni: 0.09 },
  { feed_item: 'Mineral Mixture (Poultry)', cp_score: 0, tdn_score: 0, digestibility_score: 0, mineral_score: 1, fni: 0.25 }
];

async function populateFeedScores() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Connected to database');

    // Clear existing feed scores (optional - remove if you want to keep existing data)
    console.log('🗑️ Clearing existing feed scores...');
    await connection.execute('DELETE FROM feed_scores');
    console.log('✅ Existing data cleared');

    // Insert cattle feeds
    console.log('🐄 Inserting cattle feeds...');
    for (const feed of cattleFeeds) {
      await connection.execute(
        `INSERT INTO feed_scores 
        (species, feed_item, cp_score, tdn_score, digestibility_score, mineral_score, fni) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['cattle', feed.feed_item, feed.cp_score, feed.tdn_score, feed.digestibility_score, feed.mineral_score, feed.fni]
      );
    }
    console.log(`✅ Inserted ${cattleFeeds.length} cattle feeds`);

    // Insert poultry feeds
    console.log('🐔 Inserting poultry feeds...');
    for (const feed of poultryFeeds) {
      await connection.execute(
        `INSERT INTO feed_scores 
        (species, feed_item, cp_score, tdn_score, digestibility_score, mineral_score, fni) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['poultry', feed.feed_item, feed.cp_score, feed.tdn_score, feed.digestibility_score, feed.mineral_score, feed.fni]
      );
    }
    console.log(`✅ Inserted ${poultryFeeds.length} poultry feeds`);

    // Verify inserted data
    const [cattleCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM feed_scores WHERE species = ?',
      ['cattle']
    );
    const [poultryCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM feed_scores WHERE species = ?',
      ['poultry']
    );

    console.log('\n📊 Feed Scores Summary:');
    console.log(`   🐄 Cattle feeds: ${cattleCount[0].count}`);
    console.log(`   🐔 Poultry feeds: ${poultryCount[0].count}`);
    console.log(`   📈 Total feeds: ${cattleCount[0].count + poultryCount[0].count}`);

    // Display sample cattle feeds
    console.log('\n📋 Sample Cattle Feeds:');
    const [sampleCattle] = await connection.execute(
      'SELECT feed_item, fni FROM feed_scores WHERE species = ? ORDER BY fni DESC LIMIT 5',
      ['cattle']
    );
    sampleCattle.forEach(feed => {
      console.log(`   • ${feed.feed_item}: FNI ${feed.fni}`);
    });

    // Display sample poultry feeds
    console.log('\n📋 Sample Poultry Feeds:');
    const [samplePoultry] = await connection.execute(
      'SELECT feed_item, fni FROM feed_scores WHERE species = ? ORDER BY fni DESC LIMIT 5',
      ['poultry']
    );
    samplePoultry.forEach(feed => {
      console.log(`   • ${feed.feed_item}: FNI ${feed.fni}`);
    });

    console.log('\n✅ Feed scores populated successfully!');
    console.log('\n🌾 Feed & AMU Predictor is now ready to use!');
    console.log('\n📝 Formulas:');
    console.log('   Cattle: AMU Risk = (1 - Daily FNI) × 0.45');
    console.log('   Poultry: AMU Risk = (1 - Daily FNI) × 0.65');

  } catch (error) {
    console.error('❌ Error populating feed scores:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the script
populateFeedScores().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
