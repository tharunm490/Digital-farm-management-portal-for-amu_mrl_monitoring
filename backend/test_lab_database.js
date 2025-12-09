/**
 * LABORATORY DASHBOARD - DIRECT DATABASE TEST
 * This script tests all SQL queries directly on the database
 * without requiring authentication tokens
 */

const db = require('./config/database');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}\n${colors.magenta}${msg}${colors.reset}\n${colors.cyan}${'='.repeat(70)}${colors.reset}\n`),
  query: (sql) => console.log(`${colors.cyan}Query:${colors.reset} ${sql}\n`)
};

async function testLabDashboard() {
  try {
    // 🟢 TEST 1: DASHBOARD COUNTS FOR LAB_ID = 1
    log.section('🟢 TEST 1: DASHBOARD COUNTS (LAB_ID = 1)');
    
    log.query('SELECT COUNT(*) AS pending_requests FROM sample_requests WHERE assigned_lab_id = ? AND status = ?');
    const [pending] = await db.execute(
      'SELECT COUNT(*) AS pending_requests FROM sample_requests WHERE assigned_lab_id = ? AND status = ?',
      [1, 'requested']
    );
    console.log(`Pending Requests: ${pending[0]?.pending_requests || 0}`);
    
    log.query('SELECT COUNT(*) AS samples_collected FROM sample_requests WHERE assigned_lab_id = ? AND status = ?');
    const [collected] = await db.execute(
      'SELECT COUNT(*) AS samples_collected FROM sample_requests WHERE assigned_lab_id = ? AND status = ?',
      [1, 'collected']
    );
    console.log(`Samples Collected: ${collected[0]?.samples_collected || 0}`);
    
    log.query('SELECT COUNT(*) AS under_testing FROM sample_requests WHERE assigned_lab_id = ? AND status = ?');
    const [tested] = await db.execute(
      'SELECT COUNT(*) AS under_testing FROM sample_requests WHERE assigned_lab_id = ? AND status = ?',
      [1, 'tested']
    );
    console.log(`Under Testing: ${tested[0]?.under_testing || 0}`);
    
    log.query('SELECT COUNT(*) AS reports_completed FROM lab_test_reports WHERE lab_id = ?');
    const [completed] = await db.execute(
      'SELECT COUNT(*) AS reports_completed FROM lab_test_reports WHERE lab_id = ?',
      [1]
    );
    console.log(`Reports Completed: ${completed[0]?.reports_completed || 0}`);
    
    log.success('✅ Dashboard counts fetched successfully');
    
    // 🟡 TEST 2: PENDING SAMPLE REQUESTS
    log.section('🟡 TEST 2: PENDING SAMPLE REQUESTS (LAB_ID = 1)');
    
    const pendingQuery = `
    SELECT sr.sample_request_id, sr.treatment_id, sr.farmer_id, sr.entity_id, sr.safe_date, sr.status,
           sr.created_at, sr.assigned_lab_id,
           a.species, a.tag_id, a.batch_name,
           f.farm_name, f.district, f.state,
           t.medicine, t.dose_amount, t.duration_days
    FROM sample_requests sr
    JOIN animals_or_batches a ON a.entity_id = sr.entity_id
    JOIN farms f ON f.farm_id = a.farm_id
    JOIN treatment_records t ON t.treatment_id = sr.treatment_id
    WHERE sr.assigned_lab_id = ? AND sr.status='requested'
    ORDER BY sr.safe_date ASC
    LIMIT 5`;
    
    log.query(pendingQuery.trim());
    const [pendingRequests] = await db.execute(pendingQuery, [1]);
    console.log(`Found ${pendingRequests.length} pending requests\n`);
    
    if (pendingRequests.length > 0) {
      log.info('First pending request:');
      console.log(JSON.stringify(pendingRequests[0], null, 2));
      
      if (pendingRequests.length > 1) {
        log.info(`\n... and ${pendingRequests.length - 1} more pending requests`);
      }
    } else {
      log.warn('No pending requests found - consider creating sample test data');
    }
    
    // 🧫 TEST 3: COLLECTED SAMPLES
    log.section('🧫 TEST 3: COLLECTED SAMPLES (LAB_ID = 1)');
    
    const collectedQuery = `
    SELECT sr.sample_request_id, sr.entity_id, sr.safe_date, sr.status,
           a.species, f.farm_name, s.sample_id, s.collected_date, s.sample_type
    FROM sample_requests sr
    JOIN animals_or_batches a ON a.entity_id = sr.entity_id
    JOIN farms f ON f.farm_id = a.farm_id
    LEFT JOIN samples s ON s.sample_request_id = sr.sample_request_id
    WHERE sr.assigned_lab_id = ? AND sr.status='collected'
    ORDER BY sr.safe_date DESC
    LIMIT 5`;
    
    log.query(collectedQuery.trim());
    const [collectedSamples] = await db.execute(collectedQuery, [1]);
    console.log(`Found ${collectedSamples.length} collected samples\n`);
    
    if (collectedSamples.length > 0) {
      log.info('First collected sample:');
      console.log(JSON.stringify(collectedSamples[0], null, 2));
    } else {
      log.warn('No collected samples found');
    }
    
    // 🔬 TEST 4: SAMPLES UNDER TESTING
    log.section('🔬 TEST 4: SAMPLES UNDER TESTING (LAB_ID = 1)');
    
    const testingQuery = `
    SELECT sr.sample_request_id, sr.entity_id, sr.safe_date, sr.status,
           a.species, f.farm_name, s.sample_id, s.collected_date
    FROM sample_requests sr
    JOIN animals_or_batches a ON a.entity_id = sr.entity_id
    JOIN farms f ON f.farm_id = a.farm_id
    LEFT JOIN samples s ON s.sample_request_id = sr.sample_request_id
    WHERE sr.assigned_lab_id = ? AND sr.status='tested'
    ORDER BY sr.safe_date DESC
    LIMIT 5`;
    
    log.query(testingQuery.trim());
    const [testingSamples] = await db.execute(testingQuery, [1]);
    console.log(`Found ${testingSamples.length} samples under testing\n`);
    
    if (testingSamples.length > 0) {
      log.info('First testing sample:');
      console.log(JSON.stringify(testingSamples[0], null, 2));
    } else {
      log.warn('No samples under testing found');
    }
    
    // ✅ TEST 5: ALL REPORTS (LAB VIEW)
    log.section('✅ TEST 5: ALL REPORTS - LAB VIEW (LAB_ID = 1)');
    
    const labReportsQuery = `
    SELECT ltr.report_id, ltr.final_status, ltr.tested_on,
           ltr.detected_residue, ltr.mrl_limit, ltr.withdrawal_days_remaining,
           ltr.remarks, ltr.certificate_url,
           a.species, t.medicine, f.farm_name, u.display_name AS farmer_name,
           s.sample_id, s.sample_type, s.collected_date
    FROM lab_test_reports ltr
    JOIN samples s ON s.sample_id = ltr.sample_id
    JOIN sample_requests sr ON sr.sample_request_id = s.sample_request_id
    JOIN treatment_records t ON sr.treatment_id = t.treatment_id
    JOIN animals_or_batches a ON a.entity_id = sr.entity_id
    JOIN farmers fr ON sr.farmer_id = fr.farmer_id
    JOIN users u ON fr.user_id = u.user_id
    JOIN farms f ON t.farm_id = f.farm_id
    WHERE ltr.lab_id = ?
    ORDER BY ltr.tested_on DESC
    LIMIT 5`;
    
    log.query(labReportsQuery.trim());
    const [labReports] = await db.execute(labReportsQuery, [1]);
    console.log(`Found ${labReports.length} lab reports\n`);
    
    if (labReports.length > 0) {
      log.info('First lab report:');
      console.log(JSON.stringify(labReports[0], null, 2));
    } else {
      log.warn('No lab reports found');
    }
    
    // 📋 TEST 6: AUTHORITY GLOBAL LAB REPORTS VIEW
    log.section('📋 TEST 6: AUTHORITY GLOBAL LAB REPORTS VIEW');
    
    const authorityQuery = `
    SELECT ltr.report_id, ltr.final_status, ltr.tested_on,
           ltr.detected_residue, ltr.mrl_limit, ltr.withdrawal_days_remaining,
           ltr.remarks, ltr.certificate_url,
           a.species, t.medicine, f.farm_name, u.display_name AS farmer_name,
           fr.farmer_id, l.lab_name, l.license_number, l.district, l.state,
           s.sample_type, s.collected_date
    FROM lab_test_reports ltr
    JOIN samples s ON ltr.sample_id = s.sample_id
    JOIN sample_requests sr ON s.sample_request_id = sr.sample_request_id
    JOIN treatment_records t ON sr.treatment_id = t.treatment_id
    JOIN animals_or_batches a ON sr.entity_id = a.entity_id
    JOIN farmers fr ON sr.farmer_id = fr.farmer_id
    JOIN users u ON fr.user_id = u.user_id
    JOIN farms f ON t.farm_id = f.farm_id
    JOIN laboratories l ON ltr.lab_id = l.lab_id
    ORDER BY ltr.tested_on DESC
    LIMIT 5`;
    
    log.query(authorityQuery.trim());
    const [authorityReports] = await db.execute(authorityQuery);
    console.log(`Found ${authorityReports.length} total reports across all labs\n`);
    
    if (authorityReports.length > 0) {
      log.info('First authority report:');
      console.log(JSON.stringify(authorityReports[0], null, 2));
    } else {
      log.warn('No reports found in system');
    }
    
    // 🔴 TEST 7: UNSAFE REPORTS ALERT
    log.section('🔴 TEST 7: UNSAFE REPORTS ALERT (AUTHORITY)');
    
    const unsafeQuery = `
    SELECT ltr.report_id, ltr.tested_on,
           ltr.detected_residue, ltr.mrl_limit,
           a.species, t.medicine, f.farm_name, u.display_name AS farmer_name,
           l.lab_name, l.phone, l.email, l.district
    FROM lab_test_reports ltr
    JOIN samples s ON ltr.sample_id = s.sample_id
    JOIN sample_requests sr ON s.sample_request_id = sr.sample_request_id
    JOIN treatment_records t ON sr.treatment_id = t.treatment_id
    JOIN animals_or_batches a ON sr.entity_id = a.entity_id
    JOIN farmers fr ON sr.farmer_id = fr.farmer_id
    JOIN users u ON fr.user_id = u.user_id
    JOIN farms f ON t.farm_id = f.farm_id
    JOIN laboratories l ON ltr.lab_id = l.lab_id
    WHERE ltr.final_status = 'unsafe'
    ORDER BY ltr.tested_on DESC
    LIMIT 5`;
    
    log.query(unsafeQuery.trim());
    const [unsafeReports] = await db.execute(unsafeQuery);
    console.log(`Found ${unsafeReports.length} UNSAFE reports requiring immediate action\n`);
    
    if (unsafeReports.length > 0) {
      log.warn('⚠️  UNSAFE REPORT - IMMEDIATE ACTION REQUIRED');
      console.log(JSON.stringify(unsafeReports[0], null, 2));
    } else {
      log.success('No unsafe reports - all tests passed');
    }
    
    // 📊 TEST 8: REPORTS BY STATUS BREAKDOWN
    log.section('📊 TEST 8: REPORTS BREAKDOWN BY STATUS (ALL LABS)');
    
    const statusQuery = `
    SELECT ltr.final_status, COUNT(*) as count
    FROM lab_test_reports ltr
    GROUP BY ltr.final_status
    ORDER BY count DESC`;
    
    log.query(statusQuery.trim());
    const [statusBreakdown] = await db.execute(statusQuery);
    
    console.log('Reports by status:');
    statusBreakdown.forEach(row => {
      const status = row.final_status.toUpperCase();
      const emoji = status === 'SAFE' ? '✅' : status === 'UNSAFE' ? '🔴' : '🟡';
      console.log(`${emoji} ${status}: ${row.count}`);
    });
    
    log.success('\n✅ All database tests completed successfully');
    
  } catch (error) {
    log.error(`Test error: ${error.message}`);
    console.error('Full error:', error);
  } finally {
    await db.end();
    process.exit(0);
  }
}

// Run tests
console.clear();
log.section('🧪 LABORATORY DASHBOARD - DATABASE TESTS');
log.info('Testing all SQL queries for laboratory module...\n');

testLabDashboard();
