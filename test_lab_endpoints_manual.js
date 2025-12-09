const axios = require('axios');

async function testLabEndpoints() {
  console.log('🧪 Testing Laboratory API Endpoints with Railway Database\n');

  // Test with localhost (as backend is running locally)
  const API_URL = 'http://localhost:5000/api';
  
  // You'll need to replace this with a real token from logging in
  const token = 'YOUR_LAB_TOKEN_HERE';

  const endpoints = [
    { name: 'Lab Profile', url: `${API_URL}/labs/profile`, method: 'GET' },
    { name: 'Pending Samples', url: `${API_URL}/labs/pending-samples`, method: 'GET' },
    { name: 'Untested Samples', url: `${API_URL}/labs/untested-samples`, method: 'GET' },
    { name: 'All Reports', url: `${API_URL}/labs/all-reports`, method: 'GET' },
    { name: 'Incoming Cases', url: `${API_URL}/labs/incoming-cases`, method: 'GET' },
    { name: 'Sample Requests', url: `${API_URL}/labs/sample-requests`, method: 'GET' }
  ];

  console.log('⚠️ NOTE: You need to provide a valid lab user token to test these endpoints.');
  console.log('To get a token:');
  console.log('1. Start backend: cd backend && npm start');
  console.log('2. Start frontend: cd frontend && npm start');
  console.log('3. Login as laboratory user in browser');
  console.log('4. Open browser DevTools > Application > Local Storage');
  console.log('5. Copy the "token" value');
  console.log('6. Replace YOUR_LAB_TOKEN_HERE in this script\n');

  if (token === 'YOUR_LAB_TOKEN_HERE') {
    console.log('❌ Cannot test without a valid token. Please follow the steps above.\n');
    return;
  }

  let passed = 0;
  let failed = 0;

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: endpoint.url,
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 5000
      });

      console.log(`✅ ${endpoint.name}: ${response.status} - ${JSON.stringify(response.data).substring(0, 100)}...`);
      passed++;
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${endpoint.name}: ${error.response.status} - ${error.response.data?.error || 'Error'}`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${endpoint.name}: Backend not running (connection refused)`);
      } else {
        console.log(`❌ ${endpoint.name}: ${error.message}`);
      }
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
}

testLabEndpoints().catch(err => {
  console.error('Test error:', err.message);
});
