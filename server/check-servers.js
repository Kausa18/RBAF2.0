const axios = require('axios');
const API_HOST = 'http://10.241.175.159:5000';
const MATCH_HOST = 'http://10.241.175.159:5001';

async function checkServer(url, name) {
    try {
        console.log(`\nChecking ${name} at ${url}...`);
        const response = await axios.get(url, { timeout: 5000 });
        console.log(`✅ ${name} is running! Status: ${response.status}`);
        return true;
    } catch (error) {
        console.log(`❌ ${name} is not reachable:`);
        if (error.code === 'ECONNREFUSED') {
            console.log(`   Server at ${url} is not running`);
        } else if (error.message === 'Network Error') {
            console.log(`   Network error - check if server is bound to correct IP`);
        } else {
            console.log(`   ${error.message}`);
        }
        return false;
    }
}

async function main() {
    console.log('🔍 Checking server status...');
    
    // Check main API server
    await checkServer(`${API_HOST}/api/open-requests`, 'Main API Server');
    
    // Check matching service
    await checkServer(`${MATCH_HOST}/match-providers`, 'Provider Matching Service');
    
    console.log('\n📋 Quick Fix Guide:');
    console.log('1. Start main API server:');
    console.log('   cd server');
    console.log('   npm start');
    console.log('\n2. Start matching service:');
    console.log('   cd ../road-assist-geo-python');
    console.log('   python app.py');
    console.log('\n3. If servers are running but not reachable:');
    console.log('   - Check if servers are bound to 0.0.0.0 instead of localhost');
    console.log('   - Verify the IP addresses in config/api.js are correct');
    console.log('   - Ensure no firewall is blocking the ports');
}

main().catch(console.error);