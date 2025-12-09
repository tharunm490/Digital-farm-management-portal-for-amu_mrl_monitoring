/**
 * LABORATORY DASHBOARD COMPLETE TEST SUITE
 * Tests all 6 sections of the laboratory module:
 * 1. Dashboard Counts (Pending, Collected, Testing, Completed)
 * 2. Pending Sample Requests
 * 3. Sample Collection
 * 4. Lab Test Report Upload
 * 5. All Reports View
 * 6. Authority Lab Records View
 */

const db = require('./config/database');
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const LAB_USER_TOKEN = 'YOUR_LAB_TOKEN_HERE'; // Get from login
const AUTHORITY_TOKEN = 'YOUR_AUTHORITY_TOKEN_HERE'; // Get from authority login

// Color codes for terminal output
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
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n`)
};

// Test 1: Dashboard Counts
async function testDashboardCounts() {
  log.section('TEST 1: DASHBOARD COUNTS');
  try {
    const response = await axios.get(`${BASE_URL}/api/labs/stats`, {
      headers: { Authorization: `Bearer ${LAB_USER_TOKEN}` }
    });
    
    log.success('Dashboard counts fetched');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    log.error(`Failed to fetch dashboard counts: ${error.message}`);
    return null;
  }
}

// Test 2: Fetch Pending Requests
async function testPendingRequests() {
  log.section('TEST 2: PENDING SAMPLE REQUESTS');
  try {
    const response = await axios.get(`${BASE_URL}/api/labs/pending-requests`, {
      headers: { Authorization: `Bearer ${LAB_USER_TOKEN}` }
    });
    
    log.success(`Fetched ${response.data.length} pending requests`);
    
    if (response.data.length > 0) {
      log.info(`First pending request:`);
      console.log(JSON.stringify(response.data[0], null, 2));
      return response.data[0]; // Return first for next test
    }
    return null;
  } catch (error) {
    log.error(`Failed to fetch pending requests: ${error.message}`);
    return null;
  }
}

// Test 3: Collect Sample
async function testCollectSample(pendingRequest) {
  log.section('TEST 3: SAMPLE COLLECTION');
  if (!pendingRequest) {
    log.warn('No pending request to collect sample from');
    return null;
  }

  try {
    const response = await axios.post(`${BASE_URL}/api/labs/collect-sample`, {
      sample_request_id: pendingRequest.sample_request_id,
      sample_type: 'milk',
      collected_date: new Date().toISOString().split('T')[0],
      remarks: 'Collected on site by lab staff'
    }, {
      headers: { Authorization: `Bearer ${LAB_USER_TOKEN}` }
    });
    
    log.success(`Sample collected: ID ${response.data.sample_id}`);
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data.sample_id;
  } catch (error) {
    log.error(`Failed to collect sample: ${error.message}`);
    return null;
  }
}

// Test 4: Upload Lab Test Report
async function testUploadReport(sampleId) {
  log.section('TEST 4: UPLOAD LAB TEST REPORT');
  if (!sampleId) {
    log.warn('No sample ID to upload report for');
    return null;
  }

  try {
    const response = await axios.post(`${BASE_URL}/api/labs/upload-report`, {
      sample_id: sampleId,
      detected_residue: 0.35,
      mrl_limit: 0.50,
      withdrawal_days_remaining: 0,
      final_status: 'safe',
      tested_on: new Date().toISOString().split('T')[0],
      remarks: 'Residue within acceptable limit. Safe for consumption.',
      certificate_url: 'uploads/certificates/report_' + Date.now() + '.pdf'
    }, {
      headers: { Authorization: `Bearer ${LAB_USER_TOKEN}` }
    });
    
    log.success(`Report uploaded: ID ${response.data.report_id}`);
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data.report_id;
  } catch (error) {
    log.error(`Failed to upload report: ${error.message}`);
    return null;
  }
}

// Test 5: View All Reports (Lab View)
async function testAllReports() {
  log.section('TEST 5: ALL REPORTS (LAB VIEW)');
  try {
    const response = await axios.get(`${BASE_URL}/api/labs/all-reports`, {
      headers: { Authorization: `Bearer ${LAB_USER_TOKEN}` }
    });
    
    log.success(`Fetched ${response.data.length} reports from lab`);
    
    if (response.data.length > 0) {
      log.info(`First report:`);
      console.log(JSON.stringify(response.data[0], null, 2));
    }
    
    return response.data;
  } catch (error) {
    log.error(`Failed to fetch all reports: ${error.message}`);
    return null;
  }
}

// Test 6: Authority View All Lab Reports
async function testAuthorityLabReports() {
  log.section('TEST 6: AUTHORITY LAB RECORDS VIEW');
  try {
    const response = await axios.get(`${BASE_URL}/api/labs/authority/all-lab-reports`, {
      headers: { Authorization: `Bearer ${AUTHORITY_TOKEN}` }
    });
    
    log.success(`Authority fetched ${response.data.length} lab reports from all labs`);
    
    if (response.data.length > 0) {
      log.info(`First lab report (authority view):`);
      console.log(JSON.stringify(response.data[0], null, 2));
    }
    
    return response.data;
  } catch (error) {
    log.error(`Failed to fetch authority lab reports: ${error.message}`);
    return null;
  }
}

// Test 7: Authority View Reports by Status
async function testAuthorityReportsByStatus(status = 'safe') {
  log.section(`TEST 7: AUTHORITY REPORTS BY STATUS (${status.toUpperCase()})`);
  try {
    const response = await axios.get(`${BASE_URL}/api/labs/authority/reports-by-status/${status}`, {
      headers: { Authorization: `Bearer ${AUTHORITY_TOKEN}` }
    });
    
    log.success(`Authority fetched ${response.data.length} ${status} reports`);
    
    if (response.data.length > 0) {
      log.info(`Sample ${status} report:`);
      console.log(JSON.stringify(response.data[0], null, 2));
    }
    
    return response.data;
  } catch (error) {
    log.error(`Failed to fetch ${status} reports: ${error.message}`);
    return null;
  }
}

// Test 8: Authority Unsafe Reports Alert
async function testAuthorityUnsafeReports() {
  log.section('TEST 8: AUTHORITY UNSAFE REPORTS ALERT');
  try {
    const response = await axios.get(`${BASE_URL}/api/labs/authority/unsafe-reports`, {
      headers: { Authorization: `Bearer ${AUTHORITY_TOKEN}` }
    });
    
    log.success(`Authority fetched ${response.data.length} unsafe reports`);
    
    if (response.data.length > 0) {
      log.info(`First unsafe report:`);
      console.log(JSON.stringify(response.data[0], null, 2));
    }
    
    return response.data;
  } catch (error) {
    log.error(`Failed to fetch unsafe reports: ${error.message}`);
    return null;
  }
}

// Test Database Queries Directly
async function testDatabaseQueries() {
  log.section('DATABASE QUERY TESTS');
  
  const LAB_ID = 1; // Replace with actual lab ID
  
  try {
    // Test 1: Pending Requests Count
    log.info('Testing: Pending Requests Count');
    const [pending] = await db.execute(
      'SELECT COUNT(*) as count FROM sample_requests WHERE assigned_lab_id = ? AND status = ?',
      [LAB_ID, 'requested']
    );
    console.log(`Pending: ${pending[0].count}`);
    
    // Test 2: Collected Samples Count
    log.info('Testing: Collected Samples Count');
    const [collected] = await db.execute(
      'SELECT COUNT(*) as count FROM sample_requests WHERE assigned_lab_id = ? AND status = ?',
      [LAB_ID, 'collected']
    );
    console.log(`Collected: ${collected[0].count}`);
    
    // Test 3: Under Testing Count
    log.info('Testing: Under Testing Count');
    const [tested] = await db.execute(
      'SELECT COUNT(*) as count FROM sample_requests WHERE assigned_lab_id = ? AND status = ?',
      [LAB_ID, 'tested']
    );
    console.log(`Tested: ${tested[0].count}`);
    
    // Test 4: Completed Reports Count
    log.info('Testing: Completed Reports Count');
    const [completed] = await db.execute(
      'SELECT COUNT(*) as count FROM lab_test_reports WHERE lab_id = ?',
      [LAB_ID]
    );
    console.log(`Completed: ${completed[0].count}`);
    
    // Test 5: Pending Sample Requests (detailed)
    log.info('Testing: Pending Sample Requests Query');
    const [pendingReqs] = await db.execute(`
      SELECT sr.sample_request_id, sr.treatment_id, sr.farmer_id, sr.entity_id, sr.safe_date,
             a.species, a.tag_id, f.farm_name, t.medicine
      FROM sample_requests sr
      JOIN animals_or_batches a ON a.entity_id = sr.entity_id
      JOIN farms f ON f.farm_id = a.farm_id
      JOIN treatment_records t ON t.treatment_id = sr.treatment_id
      WHERE sr.assigned_lab_id = ? AND sr.status = 'requested'
      LIMIT 1
    `, [LAB_ID]);
    if (pendingReqs.length > 0) {
      console.log(JSON.stringify(pendingReqs[0], null, 2));
    }
    
    // Test 6: All Reports (detailed)
    log.info('Testing: All Reports Query');
    const [reports] = await db.execute(`
      SELECT ltr.report_id, ltr.final_status, ltr.tested_on,
             ltr.detected_residue, ltr.mrl_limit,
             a.species, tr.medicine, f.farm_name
      FROM lab_test_reports ltr
      JOIN samples s ON s.sample_id = ltr.sample_id
      JOIN sample_requests sr ON sr.sample_request_id = s.sample_request_id
      JOIN treatment_records tr ON sr.treatment_id = tr.treatment_id
      JOIN animals_or_batches a ON a.entity_id = sr.entity_id
      JOIN farms f ON tr.farm_id = f.farm_id
      WHERE ltr.lab_id = ?
      LIMIT 1
    `, [LAB_ID]);
    if (reports.length > 0) {
      console.log(JSON.stringify(reports[0], null, 2));
    }
    
    log.success('All database queries executed successfully');
    
  } catch (error) {
    log.error(`Database query error: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  console.clear();
  log.section('LABORATORY DASHBOARD - COMPLETE TEST SUITE');
  log.info('Starting comprehensive laboratory dashboard tests...');
  
  // First, test database queries directly
  await testDatabaseQueries();
  
  // Then test API endpoints (if you have valid tokens)
  if (LAB_USER_TOKEN !== 'YOUR_LAB_TOKEN_HERE') {
    const pendingRequest = await testPendingRequests();
    const sampleId = await testCollectSample(pendingRequest);
    await testUploadReport(sampleId);
    await testAllReports();
    
    if (AUTHORITY_TOKEN !== 'YOUR_AUTHORITY_TOKEN_HERE') {
      await testAuthorityLabReports();
      await testAuthorityReportsByStatus('safe');
      await testAuthorityReportsByStatus('unsafe');
      await testAuthorityUnsafeReports();
    }
  } else {
    log.warn('Skipping API tests - provide valid tokens in the script');
    log.info('Update LAB_USER_TOKEN and AUTHORITY_TOKEN variables to test API endpoints');
  }
  
  log.section('TEST SUITE COMPLETED');
  process.exit(0);
}

// Run tests
runAllTests().catch(err => {
  log.error(`Test suite error: ${err.message}`);
  process.exit(1);
});
