require('dotenv').config();
const mysql = require('mysql2/promise');

async function createTestFeedEntries() {
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

    // Get a farmer ID
    const [farmers] = await connection.execute('SELECT farmer_id FROM farmers LIMIT 1');
    
    if (farmers.length === 0) {
      console.log('❌ No farmers found in database. Please create a farmer account first.');
      return;
    }

    const farmerId = farmers[0].farmer_id;
    console.log(`👨‍🌾 Using farmer ID: ${farmerId}`);

    // Get some cattle feeds
    const [cattleFeeds] = await connection.execute(
      'SELECT feed_id, feed_item, fni FROM feed_scores WHERE species = ? LIMIT 3',
      ['cattle']
    );

    if (cattleFeeds.length < 3) {
      console.log('❌ Not enough cattle feeds found. Run populate_feed_scores.js first.');
      return;
    }

    console.log('🐄 Creating test cattle feed entry...');

    // Create a sample cattle ration (should total 100%)
    const cattleRation = [
      { feed_id: cattleFeeds[0].feed_id, inclusion_rate: 0.40, fni: cattleFeeds[0].fni },
      { feed_id: cattleFeeds[1].feed_id, inclusion_rate: 0.35, fni: cattleFeeds[1].fni },
      { feed_id: cattleFeeds[2].feed_id, inclusion_rate: 0.25, fni: cattleFeeds[2].fni }
    ];

    // Calculate Daily FNI
    let dailyFNI = 0;
    for (const feed of cattleRation) {
      const fniContribution = feed.inclusion_rate * feed.fni;
      dailyFNI += fniContribution;

      await connection.execute(
        `INSERT INTO farmer_feed_entries 
        (farmer_id, species, feed_id, inclusion_rate, fni_contribution, daily_fni, amu_risk) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [farmerId, 'cattle', feed.feed_id, feed.inclusion_rate, fniContribution, 0, 0]
      );
    }

    const healthRisk = 1 - dailyFNI;
    const amuRisk = healthRisk * 0.45; // Cattle sensitivity factor

    // Determine risk level
    let riskLevel;
    if (amuRisk < 0.20) riskLevel = 'low';
    else if (amuRisk < 0.40) riskLevel = 'moderate';
    else if (amuRisk < 0.60) riskLevel = 'high';
    else riskLevel = 'very_high';

    // Update all entries with final values
    await connection.execute(
      `UPDATE farmer_feed_entries 
      SET daily_fni = ?, amu_risk = ? 
      WHERE farmer_id = ? AND species = ? AND daily_fni = 0`,
      [dailyFNI, amuRisk, farmerId, 'cattle']
    );

    // Insert into feed risk summary
    await connection.execute(
      `INSERT INTO feed_risk_summary 
      (farmer_id, species, daily_fni, amu_risk, risk_level) 
      VALUES (?, ?, ?, ?, ?)`,
      [farmerId, 'cattle', dailyFNI, amuRisk, riskLevel]
    );

    console.log('✅ Cattle feed entry created');
    console.log(`   Daily FNI: ${dailyFNI.toFixed(4)}`);
    console.log(`   Health Risk: ${healthRisk.toFixed(4)}`);
    console.log(`   AMU Risk: ${amuRisk.toFixed(4)}`);
    console.log(`   Risk Level: ${riskLevel.toUpperCase()}`);

    // Create a poultry entry
    const [poultryFeeds] = await connection.execute(
      'SELECT feed_id, feed_item, fni FROM feed_scores WHERE species = ? LIMIT 3',
      ['poultry']
    );

    if (poultryFeeds.length >= 3) {
      console.log('\n🐔 Creating test poultry feed entry...');

      const poultryRation = [
        { feed_id: poultryFeeds[0].feed_id, inclusion_rate: 0.50, fni: poultryFeeds[0].fni },
        { feed_id: poultryFeeds[1].feed_id, inclusion_rate: 0.30, fni: poultryFeeds[1].fni },
        { feed_id: poultryFeeds[2].feed_id, inclusion_rate: 0.20, fni: poultryFeeds[2].fni }
      ];

      let poultryDailyFNI = 0;
      for (const feed of poultryRation) {
        const fniContribution = feed.inclusion_rate * feed.fni;
        poultryDailyFNI += fniContribution;

        await connection.execute(
          `INSERT INTO farmer_feed_entries 
          (farmer_id, species, feed_id, inclusion_rate, fni_contribution, daily_fni, amu_risk) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [farmerId, 'poultry', feed.feed_id, feed.inclusion_rate, fniContribution, 0, 0]
        );
      }

      const poultryHealthRisk = 1 - poultryDailyFNI;
      const poultryAmuRisk = poultryHealthRisk * 0.65; // Poultry sensitivity factor

      let poultryRiskLevel;
      if (poultryAmuRisk < 0.20) poultryRiskLevel = 'low';
      else if (poultryAmuRisk < 0.40) poultryRiskLevel = 'moderate';
      else if (poultryAmuRisk < 0.60) poultryRiskLevel = 'high';
      else poultryRiskLevel = 'very_high';

      await connection.execute(
        `UPDATE farmer_feed_entries 
        SET daily_fni = ?, amu_risk = ? 
        WHERE farmer_id = ? AND species = ? AND daily_fni = 0`,
        [poultryDailyFNI, poultryAmuRisk, farmerId, 'poultry']
      );

      await connection.execute(
        `INSERT INTO feed_risk_summary 
        (farmer_id, species, daily_fni, amu_risk, risk_level) 
        VALUES (?, ?, ?, ?, ?)`,
        [farmerId, 'poultry', poultryDailyFNI, poultryAmuRisk, poultryRiskLevel]
      );

      console.log('✅ Poultry feed entry created');
      console.log(`   Daily FNI: ${poultryDailyFNI.toFixed(4)}`);
      console.log(`   Health Risk: ${poultryHealthRisk.toFixed(4)}`);
      console.log(`   AMU Risk: ${poultryAmuRisk.toFixed(4)}`);
      console.log(`   Risk Level: ${poultryRiskLevel.toUpperCase()}`);
    }

    // Verify data
    const [summaryCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM feed_risk_summary'
    );
    
    console.log('\n📊 Summary:');
    console.log(`   Total feed risk entries: ${summaryCount[0].count}`);
    console.log('\n✅ Test data created successfully!');
    console.log('🔄 Refresh the Authority Feed-Nutrition Analytics page to see the data.');

  } catch (error) {
    console.error('❌ Error creating test entries:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

createTestFeedEntries().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
