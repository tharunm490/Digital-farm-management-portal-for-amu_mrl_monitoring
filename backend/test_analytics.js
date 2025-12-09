// Test Analytics Dashboard Routes
// Run this with: node test_analytics.js

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testAnalyticsDashboard() {
  console.log('\n🧪 Testing Analytics Dashboard Queries...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    // Test 1: Overview Stats
    console.log('📊 Test 1: Overview Stats');
    const [overview] = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM amu_records) as total_amu,
        (SELECT COUNT(DISTINCT farm_id) FROM amu_records) as total_farms,
        (SELECT COUNT(*) FROM lab_reports) as total_reports,
        (SELECT COUNT(*) FROM lab_reports WHERE result_category = 'Unsafe') as unsafe_reports,
        (SELECT COUNT(*) FROM sample_requests WHERE status = 'Pending') as pending_samples
    `);
    console.log('✅ Overview:', overview[0]);

    // Test 2: Category Usage
    console.log('\n💊 Test 2: Antibiotic Category Usage');
    const [categoryUsage] = await connection.execute(`
      SELECT category, COUNT(*) as usage
      FROM amu_records
      GROUP BY category
      ORDER BY usage DESC
      LIMIT 10
    `);
    console.log(`✅ Found ${categoryUsage.length} categories:`, categoryUsage);

    // Test 3: Species Usage
    console.log('\n🐄 Test 3: Species Usage');
    const [speciesUsage] = await connection.execute(`
      SELECT species, COUNT(*) as usage
      FROM amu_records
      GROUP BY species
      ORDER BY usage DESC
      LIMIT 10
    `);
    console.log(`✅ Found ${speciesUsage.length} species:`, speciesUsage);

    // Test 4: Monthly Trends (Last 12 months)
    console.log('\n📈 Test 4: Monthly Trends');
    const [monthlyTrends] = await connection.execute(`
      SELECT 
        DATE_FORMAT(treatment_date, '%Y-%m') as month,
        COUNT(*) as usage
      FROM amu_records
      WHERE treatment_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `);
    console.log(`✅ Found ${monthlyTrends.length} months of data:`, monthlyTrends);

    // Test 5: Lab Reports Status
    console.log('\n🧪 Test 5: Lab Reports Status');
    const [labReports] = await connection.execute(`
      SELECT 
        result_category,
        COUNT(*) as count
      FROM lab_reports
      GROUP BY result_category
    `);
    console.log('✅ Lab Reports:', labReports);

    // Test 6: State Usage
    console.log('\n🗺️ Test 6: State-wise Usage');
    const [stateUsage] = await connection.execute(`
      SELECT 
        f.state,
        COUNT(a.id) as usage
      FROM amu_records a
      JOIN farms f ON a.farm_id = f.id
      GROUP BY f.state
      ORDER BY usage DESC
      LIMIT 10
    `);
    console.log(`✅ Found ${stateUsage.length} states:`, stateUsage);

    // Test 7: District Usage
    console.log('\n🏙️ Test 7: District-wise Usage');
    const [districtUsage] = await connection.execute(`
      SELECT 
        f.state,
        f.district,
        COUNT(a.id) as usage
      FROM amu_records a
      JOIN farms f ON a.farm_id = f.id
      GROUP BY f.state, f.district
      ORDER BY usage DESC
      LIMIT 15
    `);
    console.log(`✅ Found ${districtUsage.length} districts:`, districtUsage);

    // Test 8: Withdrawal Compliance
    console.log('\n✅ Test 8: Withdrawal Compliance');
    const [compliance] = await connection.execute(`
      SELECT 
        COUNT(*) as total_treatments,
        SUM(CASE WHEN withdrawal_period >= 7 THEN 1 ELSE 0 END) as compliant_count,
        SUM(CASE WHEN withdrawal_period < 7 OR withdrawal_period IS NULL THEN 1 ELSE 0 END) as non_compliant_count,
        ROUND((SUM(CASE WHEN withdrawal_period >= 7 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as compliance_rate
      FROM amu_records
    `);
    console.log('✅ Compliance:', compliance[0]);

    // Test 9: Risky Farms
    console.log('\n🚨 Test 9: Risky Farms (Top 10)');
    const [riskyFarms] = await connection.execute(`
      SELECT 
        f.id as farm_id,
        f.farm_name,
        f.farmer_name,
        f.district,
        f.state,
        f.taluk,
        COUNT(lr.id) as unsafe_count,
        MAX(lr.residue_level) as max_residue
      FROM lab_reports lr
      JOIN sample_requests sr ON lr.request_id = sr.id
      JOIN amu_records ar ON sr.treatment_id = ar.id
      JOIN farms f ON ar.farm_id = f.id
      WHERE lr.result_category = 'Unsafe'
      GROUP BY f.id, f.farm_name, f.farmer_name, f.district, f.state, f.taluk
      ORDER BY unsafe_count DESC, max_residue DESC
      LIMIT 10
    `);
    console.log(`✅ Found ${riskyFarms.length} risky farms:`, riskyFarms);

    // Test 10: Automated Insights
    console.log('\n💡 Test 10: Automated Insights');
    const insights = [];
    
    // Check unsafe report threshold
    if (overview[0].unsafe_reports > 10) {
      insights.push({
        type: 'danger',
        message: `🚨 ALERT: ${overview[0].unsafe_reports} unsafe lab reports detected. Immediate action required.`
      });
    }
    
    // Check pending samples
    if (overview[0].pending_samples > 20) {
      insights.push({
        type: 'warning',
        message: `⚠️ WARNING: ${overview[0].pending_samples} pending sample requests. Review collection schedule.`
      });
    }
    
    // Check compliance
    if (compliance[0].compliance_rate < 70) {
      insights.push({
        type: 'danger',
        message: `🔴 CRITICAL: Withdrawal compliance at ${compliance[0].compliance_rate}%. Below acceptable threshold.`
      });
    }
    
    console.log(`✅ Generated ${insights.length} insights:`, insights);

    console.log('\n✅ All Analytics Tests Passed!\n');

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run tests
testAnalyticsDashboard()
  .then(() => {
    console.log('🎉 Analytics Dashboard is ready for deployment!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Analytics test failed:', error);
    process.exit(1);
  });
