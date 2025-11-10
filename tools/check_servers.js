const axios = require('axios');

// Configuration
const API_HOST = 'http://172.20.10.5:5000';
const MATCH_HOST = 'http://172.20.10.5:5001';
const TIMEOUT = 5000; // 5 seconds

// Endpoints to check
const endpoints = [
  { name: 'Main API - Open Requests', url: `${API_HOST}/api/open-requests` },
  { name: 'Main API - Login', url: `${API_HOST}/api/login`, method: 'POST', data: { email: 'test@test.com', password: 'test' } },
  { name: 'Provider Matcher', url: `${MATCH_HOST}/match-providers` },
];

// Test a single endpoint
async function testEndpoint(endpoint) {
  try {
    const config = {
      method: endpoint.method || 'GET',
      url: endpoint.url,
      timeout: TIMEOUT,
      validateStatus: null // Don't reject on any status code
    };
    if (endpoint.data) {
      config.data = endpoint.data;
    }
    
    console.log(`\nTesting ${endpoint.name}...`);
    console.log(`URL: ${endpoint.url}`);
    
    const start = Date.now();
    const response = await axios(config);
    const duration = Date.now() - start;

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Time: ${duration}ms`);
    
    if (response.status >= 200 && response.status < 300) {
      console.log('✅ Endpoint is responding successfully');
    } else if (response.status === 401 || response.status === 403) {
      console.log('✅ Endpoint requires auth (expected)');
    } else {
      console.log('❌ Endpoint returned error status');
      if (response.data) {
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }
    }
  } catch (error) {
    console.log('❌ Error testing endpoint');
    if (error.code === 'ECONNREFUSED') {
      console.log('Server is not running or port is blocked');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.log('Request timed out - server may be slow or unreachable');
    } else {
      console.log('Error details:', error.message);
      if (error.response) {
        console.log('Response:', error.response.status, error.response.statusText);
        console.log('Data:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

// Main check function
async function checkServers() {
  console.log('🔍 Starting server diagnostics...');
  console.log('API Server:', API_HOST);
  console.log('Match Server:', MATCH_HOST);
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n📋 Summary of checks:');
  console.log('1. Verify these IPs are correct for your network:');
  console.log(`   Main API: ${API_HOST}`);
  console.log(`   Matcher: ${MATCH_HOST}`);
  console.log('\n2. If using Expo on real device:');
  console.log('   - Ensure device & server are on same network');
  console.log('   - Try your computer\'s LAN IP (ipconfig)');
  console.log('\n3. If using Android Emulator:');
  console.log('   - Use 10.0.2.2 instead of localhost');
  console.log('   - Check server is bound to 0.0.0.0');
}

// Run checks
checkServers().catch(console.error);