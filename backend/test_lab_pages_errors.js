/**
 * LABORATORY PAGES - ERROR DIAGNOSTICS TEST
 * This script tests each lab page endpoint and shows specific errors
 */

const db = require('./config/database');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n`)
};

async function testLabPages() {
  const LAB_ID = 1;
  
  try {
    // TEST 1: Sample Collection Page - /api/labs/pending-samples
    log.section('TEST 1: Sample Collection Page');
    log.info('Endpoint: GET /api/labs/pending-samples');
    try {
      const [samples] = await db.execute(`
        SELECT sr.sample_request_id, sr.entity_id, sr.safe_date, sr.status,
               a.species, f.farm_name
        FROM sample_requests sr
        JOIN animals_or_batches a ON a.entity_id = sr.entity_id
        JOIN farms f ON f.farm_id = a.farm_id
        WHERE sr.assigned_lab_id = ? 
        AND sr.status IN ('approved', 'requested')
        AND sr.safe_date <= CURDATE()
        AND sr.sample_request_id NOT IN (
          SELECT DISTINCT sample_request_id FROM samples
        )
        ORDER BY sr.safe_date ASC
      `, [LAB_ID]);
      
      if (samples.length > 0) {
        log.success(`Found ${samples.length} pending samples ready for collection`);
        console.log('Sample:', JSON.stringify(samples[0], null, 2));
      } else {
        log.info('No pending samples found (this is OK if no samples are ready)');
      }
    } catch (e) {
      log.error(`Sample Collection failed: ${e.message}`);
    }

    // TEST 2: Test Report Entry Page - /api/labs/untested-samples
    log.section('TEST 2: Test Report Entry Page');
    log.info('Endpoint: GET /api/labs/untested-samples');
    try {
      const [untested] = await db.execute(`
        SELECT s.sample_id, s.sample_type, s.collected_date,
               sr.entity_id
        FROM samples s
        JOIN sample_requests sr ON sr.sample_request_id = s.sample_request_id
        WHERE sr.assigned_lab_id = ?
        AND sr.status = 'collected'
        AND s.sample_id NOT IN (
          SELECT DISTINCT sample_id FROM lab_test_reports
        )
        ORDER BY s.collected_date ASC
      `, [LAB_ID]);
      
      if (untested.length > 0) {
        log.success(`Found ${untested.length} untested samples`);
        console.log('Sample:', JSON.stringify(untested[0], null, 2));
      } else {
        log.info('No untested samples found (this is OK if all are tested)');
      }
    } catch (e) {
      log.error(`Test Report Entry failed: ${e.message}`);
    }

    // TEST 3: All Reports Page - /api/labs/all-reports
    log.section('TEST 3: All Reports Page');
    log.info('Endpoint: GET /api/labs/all-reports');
    try {
      const [reports] = await db.execute(`
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
      `, [LAB_ID]);
      
      if (reports.length > 0) {
        log.success(`Found ${reports.length} reports`);
        console.log('Report:', JSON.stringify(reports[0], null, 2));
      } else {
        log.info('No reports found (this is OK if no reports submitted yet)');
      }
    } catch (e) {
      log.error(`All Reports failed: ${e.message}`);
    }

    // TEST 4: Incoming Treatment Cases - /api/labs/incoming-cases
    log.section('TEST 4: Incoming Treatment Cases Page');
    log.info('Endpoint: GET /api/labs/incoming-cases');
    try {
      const [cases] = await db.execute(`
        SELECT ar.amu_id, tr.treatment_id, tr.entity_id, tr.user_id as farmer_id,
               ar.safe_date, tr.medicine, 
               f.farm_name, f.district, f.state
        FROM amu_records ar
        JOIN treatment_records tr ON ar.treatment_id = tr.treatment_id
        JOIN farms f ON f.farm_id = tr.farm_id
        WHERE ar.safe_date IS NOT NULL
        AND tr.treatment_id NOT IN (
          SELECT DISTINCT treatment_id FROM sample_requests
        )
        ORDER BY ar.safe_date ASC
      `);
      
      if (cases.length > 0) {
        log.success(`Found ${cases.length} incoming cases`);
        console.log('Case:', JSON.stringify(cases[0], null, 2));
      } else {
        log.info('No incoming cases found (this is OK if all assigned)');
      }
    } catch (e) {
      log.error(`Incoming Cases failed: ${e.message}`);
    }

    // TEST 5: Laboratory Profile - /api/labs/profile
    log.section('TEST 5: Laboratory Profile Page');
    log.info('Endpoint: GET /api/labs/profile');
    try {
      const [labs] = await db.execute(`
        SELECT * FROM laboratories WHERE lab_id = ?
      `, [LAB_ID]);
      
      if (labs.length > 0) {
        log.success('Lab profile exists');
        console.log('Profile:', JSON.stringify(labs[0], null, 2));
      } else {
        log.error('No lab profile found - needs to be created');
        log.info('Solution: Login as lab user to auto-create profile');
      }
    } catch (e) {
      log.error(`Lab Profile failed: ${e.message}`);
    }

    // TEST 6: Check required tables exist
    log.section('TEST 6: Database Tables Check');
    const requiredTables = [
      'sample_requests',
      'samples',
      'lab_test_reports',
      'laboratories',
      'amu_records',
      'treatment_records',
      'animals_or_batches',
      'farms'
    ];
    
    for (const table of requiredTables) {
      try {
        await db.execute(`SELECT 1 FROM ${table} LIMIT 1`);
        log.success(`Table '${table}' exists`);
      } catch (e) {
        log.error(`Table '${table}' missing or inaccessible`);
      }
    }

    log.section('SUMMARY');
    log.info('If pages show errors, check:');
    log.info('1. Backend server is running (npm start in backend folder)');
    log.info('2. Frontend can connect to http://localhost:5000');
    log.info('3. User is logged in as laboratory role');
    log.info('4. Lab profile exists (auto-created on first login)');
    log.info('5. Sample data exists (use setup_lab_sample_data.js)');
    
  } catch (error) {
    log.error(`Test error: ${error.message}`);
    console.error('Full error:', error);
  } finally {
    await db.end();
    process.exit(0);
  }
}

// Run diagnostics
console.clear();
log.section('🧪 LABORATORY PAGES - ERROR DIAGNOSTICS');
log.info('Testing all lab page endpoints...\n');

testLabPages();
