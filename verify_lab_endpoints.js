#!/usr/bin/env node

/**
 * Lab Dashboard Endpoint Verification Script
 * Verifies that all required endpoints exist and are registered
 * 
 * This checks for 404 (not found) vs other errors (like auth failures)
 * If endpoint exists, it will return auth error instead of 404
 */

const http = require('http');
const https = require('https');

const API_URL = 'http://localhost:5000';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Endpoints to verify
const ENDPOINTS = [
  { method: 'GET', path: '/api/labs/stats', description: 'Get lab statistics' },
  { method: 'GET', path: '/api/labs/pending-requests', description: 'Get pending sample requests' },
  { method: 'GET', path: '/api/labs/untested-samples', description: 'Get untested samples' },
  { method: 'GET', path: '/api/labs/all-reports', description: 'Get all lab reports' },
  { method: 'GET', path: '/api/labs/profile', description: 'Get lab profile' },
  { method: 'GET', path: '/api/notifications', description: 'Get notifications' },
  { method: 'GET', path: '/api/labs/sample-requests', description: 'Get sample requests' },
  { method: 'GET', path: '/api/labs/incoming-cases', description: 'Get incoming treatment cases' },
  { method: 'POST', path: '/api/labs/collect-sample', description: 'Collect sample (POST)' },
  { method: 'POST', path: '/api/labs/upload-report', description: 'Upload report (POST)' },
  { method: 'POST', path: '/api/labs/assign-treatment', description: 'Assign treatment (POST)' },
  { method: 'PUT', path: '/api/labs/profile', description: 'Update lab profile (PUT)' }
];

async function checkEndpoint(method, path) {
  return new Promise((resolve) => {
    const url = new URL(path, API_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        // 404 means endpoint doesn't exist
        // Any other status (401, 500, etc) means endpoint exists but has other issues
        const exists = res.statusCode !== 404;
        resolve({
          path,
          method,
          statusCode: res.statusCode,
          exists: exists,
          message: res.statusMessage
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        path,
        method,
        statusCode: 0,
        exists: false,
        message: error.message
      });
    });

    // Send empty body for POST/PUT
    if (method === 'POST' || method === 'PUT') {
      req.write('{}');
    }
    req.end();
  });
}

async function runVerification() {
  console.log(`\n${colors.bright}${colors.blue}🧪 LAB DASHBOARD ENDPOINT VERIFICATION${colors.reset}\n`);
  console.log(`API URL: ${colors.cyan}${API_URL}${colors.reset}\n`);

  // Check if backend is running
  console.log('Checking backend connectivity...');
  try {
    const response = await new Promise((resolve, reject) => {
      const req = http.request(`${API_URL}/health`, { method: 'GET' }, (res) => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data });
        });
      });
      req.on('error', reject);
      req.end();
    });

    if (response.statusCode === 200) {
      console.log(`${colors.green}✅ Backend is running${colors.reset}\n`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Backend is not running${colors.reset}`);
    console.log(`   Start it with: cd backend && npm start\n`);
    return;
  }

  console.log(`${colors.bright}Testing ${ENDPOINTS.length} endpoints...${colors.reset}\n`);

  let existCount = 0;
  let missingCount = 0;

  // Test each endpoint
  for (const endpoint of ENDPOINTS) {
    const result = await checkEndpoint(endpoint.method, endpoint.path);

    if (result.exists) {
      console.log(`${colors.green}✅${colors.reset} ${endpoint.method.padEnd(6)} ${endpoint.path}`);
      console.log(`   ${colors.cyan}${endpoint.description}${colors.reset}`);
      console.log(`   Status: ${result.statusCode} (endpoint exists)\n`);
      existCount++;
    } else {
      console.log(`${colors.red}❌${colors.reset} ${endpoint.method.padEnd(6)} ${endpoint.path}`);
      console.log(`   ${colors.cyan}${endpoint.description}${colors.reset}`);
      console.log(`   Status: ${result.statusCode} (endpoint not found)\n`);
      missingCount++;
    }
  }

  // Summary
  console.log(`\n${colors.bright}${colors.blue}SUMMARY${colors.reset}\n`);
  console.log(`Total Endpoints: ${ENDPOINTS.length}`);
  console.log(`${colors.green}Existing: ${existCount}${colors.reset}`);
  console.log(`${colors.red}Missing: ${missingCount}${colors.reset}`);
  console.log(`Coverage: ${((existCount / ENDPOINTS.length) * 100).toFixed(1)}%\n`);

  if (missingCount === 0) {
    console.log(`${colors.green}${colors.bright}✅ ALL ENDPOINTS ARE REGISTERED!${colors.reset}\n`);
    console.log(`Now test with a valid lab user token:\n`);
    console.log(`${colors.cyan}node test_lab_dashboard.js "<YOUR_TOKEN>"${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}${colors.bright}⚠️  Some endpoints are missing.${colors.reset}\n`);
    console.log(`Check that labRoutes are registered in server.js:\n`);
    console.log(`${colors.cyan}app.use('/api/labs', require('./routes/labRoutes'));${colors.reset}\n`);
  }
}

runVerification().catch(error => {
  console.error(`${colors.red}Verification error: ${error.message}${colors.reset}`);
  process.exit(1);
});
