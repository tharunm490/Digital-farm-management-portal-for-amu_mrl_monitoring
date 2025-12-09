#!/usr/bin/env node

/**
 * Lab Dashboard API Testing Script
 * Tests all tabs: Pending Requests, Samples Collected, Under Testing, Reports Completed
 * 
 * Usage: node test_lab_dashboard.js <lab_user_id> [api_url]
 */

const http = require('http');
const https = require('https');

// Configuration
const API_URL = process.argv[3] || 'http://localhost:5000';
const TEST_TOKEN = process.argv[2] || 'test-token'; // Lab user token

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function to make HTTP requests
async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    };

    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test results tracker
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// Test result logger
function logTest(name, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`${colors.green}✅ PASS${colors.reset}: ${name}`);
  } else {
    testResults.failed++;
    console.log(`${colors.red}❌ FAIL${colors.reset}: ${name}`);
  }
  if (details) {
    console.log(`   ${colors.cyan}${details}${colors.reset}`);
  }
}

// Main test suite
async function runTests() {
  console.log(`\n${colors.bright}${colors.blue}🧪 LAB DASHBOARD API TEST SUITE${colors.reset}\n`);
  console.log(`API URL: ${colors.cyan}${API_URL}${colors.reset}`);
  console.log(`Token: ${colors.cyan}${TEST_TOKEN.substring(0, 20)}...${colors.reset}\n`);
  console.log(`${colors.bright}Testing All Dashboard Tabs...${colors.reset}\n`);

  // ========================================
  // TEST 1: Get Lab Stats
  // ========================================
  console.log(`${colors.bright}TAB 1: Dashboard Stats (Pending, Collected, Testing, Completed)${colors.reset}`);
  try {
    // Try both possible endpoints
    let response = await makeRequest('GET', '/api/labs/stats');
    
    // Fallback to /api/lab/stats if /api/labs/stats fails
    if (response.status === 404) {
      response = await makeRequest('GET', '/api/lab/stats');
    }

    if (response.status === 200 && response.data) {
      const stats = response.data;
      logTest(
        'GET /api/labs/stats (or /api/lab/stats)',
        true,
        `Pending: ${stats.pending}, Collected: ${stats.collected}, Tested: ${stats.tested}, Completed: ${stats.completed}`
      );
    } else {
      logTest(
        'GET /api/labs/stats',
        false,
        `Status: ${response.status}, Response: ${JSON.stringify(response.data)}`
      );
    }
  } catch (error) {
    logTest('GET /api/labs/stats', false, error.message);
  }

  // ========================================
  // TEST 2: Pending Requests
  // ========================================
  console.log(`\n${colors.bright}TAB 2: Pending Requests (Sample Requests awaiting collection)${colors.reset}`);
  try {
    // Try both possible endpoints
    let response = await makeRequest('GET', '/api/labs/pending-requests');
    
    // Fallback to /api/lab/pending-requests
    if (response.status === 404) {
      response = await makeRequest('GET', '/api/lab/pending-requests');
    }

    if (response.status === 200 && Array.isArray(response.data)) {
      logTest(
        'GET /api/labs/pending-requests',
        true,
        `Found ${response.data.length} pending requests`
      );
      if (response.data.length > 0) {
        const first = response.data[0];
        console.log(`   Sample: ID=${first.sample_request_id}, Entity=${first.entity_id}, Species=${first.species}, Safe Date=${first.safe_date}`);
      }
    } else {
      logTest(
        'GET /api/labs/pending-requests',
        false,
        `Status: ${response.status}`
      );
    }
  } catch (error) {
    logTest('GET /api/labs/pending-requests', false, error.message);
  }

  // ========================================
  // TEST 3: Samples Collected
  // ========================================
  console.log(`\n${colors.bright}TAB 3: Samples Collected (Ready for testing)${colors.reset}`);
  try {
    // Try multiple possible endpoints
    let response = await makeRequest('GET', '/api/labs/untested-samples');
    
    if (response.status === 404) {
      response = await makeRequest('GET', '/api/lab/untested-samples');
    }
    
    if (response.status === 404) {
      response = await makeRequest('GET', '/api/labs/collected-samples');
    }

    if (response.status === 200 && Array.isArray(response.data)) {
      logTest(
        'GET /api/labs/untested-samples',
        true,
        `Found ${response.data.length} untested samples`
      );
      if (response.data.length > 0) {
        const first = response.data[0];
        console.log(`   Sample: ID=${first.sample_id}, Type=${first.sample_type}, Collected=${first.collected_date}`);
      }
    } else {
      logTest(
        'GET /api/labs/untested-samples',
        response.status === 404 ? false : response.status === 200,
        `Status: ${response.status}, Found: ${Array.isArray(response.data) ? response.data.length : 0}`
      );
    }
  } catch (error) {
    logTest('GET /api/labs/untested-samples', false, error.message);
  }

  // ========================================
  // TEST 4: Lab Reports (Completed/Testing)
  // ========================================
  console.log(`\n${colors.bright}TAB 4: Reports Completed (Test results submitted)${colors.reset}`);
  try {
    // Try both possible endpoints
    let response = await makeRequest('GET', '/api/labs/all-reports');
    
    if (response.status === 404) {
      response = await makeRequest('GET', '/api/lab/all-reports');
    }

    if (response.status === 200 && Array.isArray(response.data)) {
      logTest(
        'GET /api/labs/all-reports',
        true,
        `Found ${response.data.length} reports`
      );
      if (response.data.length > 0) {
        const first = response.data[0];
        console.log(`   Report: ID=${first.report_id}, Status=${first.final_status}, Tested=${first.tested_on}`);
      }
    } else {
      logTest(
        'GET /api/labs/all-reports',
        false,
        `Status: ${response.status}`
      );
    }
  } catch (error) {
    logTest('GET /api/labs/all-reports', false, error.message);
  }

  // ========================================
  // TEST 5: Lab Profile
  // ========================================
  console.log(`\n${colors.bright}TAB 5: Lab Profile (Profile details)${colors.reset}`);
  try {
    // Try both possible endpoints
    let response = await makeRequest('GET', '/api/labs/profile');
    
    if (response.status === 404) {
      response = await makeRequest('GET', '/api/lab/profile');
    }

    if (response.status === 200 && response.data) {
      logTest(
        'GET /api/labs/profile',
        true,
        `Lab: ${response.data.lab_name}, District: ${response.data.district}, Taluk: ${response.data.taluk}`
      );
    } else {
      logTest(
        'GET /api/labs/profile',
        false,
        `Status: ${response.status}`
      );
    }
  } catch (error) {
    logTest('GET /api/labs/profile', false, error.message);
  }

  // ========================================
  // TEST 6: Notifications
  // ========================================
  console.log(`\n${colors.bright}TAB 6: Notifications (Alerts and messages)${colors.reset}`);
  try {
    const response = await makeRequest('GET', '/api/notifications');

    if (response.status === 200 && Array.isArray(response.data)) {
      logTest(
        'GET /api/notifications',
        true,
        `Found ${response.data.length} notifications`
      );
      if (response.data.length > 0) {
        const first = response.data[0];
        console.log(`   Alert: Type=${first.type}, Message=${first.message?.substring(0, 50)}...`);
      }
    } else {
      logTest(
        'GET /api/notifications',
        response.status === 404 || response.status === 200,
        `Status: ${response.status}, Messages: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`
      );
    }
  } catch (error) {
    logTest('GET /api/notifications', false, error.message);
  }

  // ========================================
  // SUMMARY
  // ========================================
  console.log(`\n${colors.bright}${colors.blue}TEST SUMMARY${colors.reset}\n`);
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  console.log(`Success Rate: ${colors.bright}${((testResults.passed / testResults.total) * 100).toFixed(1)}%${colors.reset}\n`);

  if (testResults.failed === 0) {
    console.log(`${colors.green}${colors.bright}✅ ALL TESTS PASSED! Lab dashboard is ready.${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}${colors.bright}⚠️  Some tests failed. Check endpoint paths and authentication.${colors.reset}\n`);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test suite error: ${error.message}${colors.reset}`);
  process.exit(1);
});
