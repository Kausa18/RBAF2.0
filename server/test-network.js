const http = require('http');

const YOUR_IP = '10.241.175.159';
const TEST_ENDPOINTS = [
    { name: 'Main API Health', url: `http://${YOUR_IP}:5000/api/health` },
    { name: 'Main API Open Requests', url: `http://${YOUR_IP}:5000/api/open-requests` },
    { name: 'Provider Matcher Health', url: `http://${YOUR_IP}:5001/health` }
];

async function testEndpoint(endpoint) {
    return new Promise((resolve) => {
        console.log(`\nTesting ${endpoint.name}...`);
        console.log(`URL: ${endpoint.url}`);
        
        const req = http.get(endpoint.url, (res) => {
            console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
            
            let data = '';
            res.on('data', chunk => data += chunk);
            
            res.on('end', () => {
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        console.log('Response:', JSON.stringify(parsed, null, 2));
                    } catch {
                        console.log('Response:', data);
                    }
                }
                resolve(true);
            });
        });
        
        req.on('error', (error) => {
            console.log('❌ Error:', error.message);
            if (error.code === 'ECONNREFUSED') {
                console.log(`   Server at ${endpoint.url} is not running`);
            }
            resolve(false);
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            console.log('❌ Timeout after 5s');
            resolve(false);
        });
    });
}

async function main() {
    console.log('🔍 Testing API Connectivity');
    console.log('-------------------------');
    console.log(`Testing servers at IP: ${YOUR_IP}`);
    
    let allSuccess = true;
    for (const endpoint of TEST_ENDPOINTS) {
        const success = await testEndpoint(endpoint);
        if (!success) allSuccess = false;
    }
    
    console.log('\n📋 Summary:');
    if (!allSuccess) {
        console.log('\nTroubleshooting steps:');
        console.log('1. Check if both servers are running:');
        console.log('   - Main API: npm start (in server folder)');
        console.log('   - Matcher: python app.py (in road-assist-geo-python folder)');
        console.log('\n2. Check firewall settings:');
        console.log('   - Allow incoming connections to ports 5000 and 5001');
        console.log('   - Temporarily disable firewall to test');
        console.log('\n3. Verify server binding:');
        console.log('   - Both servers should bind to 0.0.0.0');
        console.log('   - Check server.js and app.py');
    }
}

main().catch(console.error);