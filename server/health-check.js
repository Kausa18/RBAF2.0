const http = require('http');

const API_HOST = 'localhost';  // Using localhost for direct testing
const API_PORT = 5000;
const MATCH_PORT = 5001;

function checkEndpoint(host, port, path, name, method = 'GET') {
    return new Promise((resolve) => {
        const req = http.get({
            host: host,
            port: port,
            path: path,
            timeout: 5000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`✅ ${name} is running!`);
                console.log(`   Status: ${res.statusCode}`);
                try {
                    const parsed = JSON.parse(data);
                    console.log(`   Response: ${JSON.stringify(parsed)}\n`);
                } catch (e) {
                    console.log(`   Response: ${data}\n`);
                }
                resolve(true);
            });
        });

        req.on('error', (err) => {
            console.log(`❌ ${name} error:`, err.message);
            if (err.code === 'ECONNREFUSED') {
                console.log(`   → Server at ${host}:${port} is not running`);
            }
            resolve(false);
        });

        req.on('timeout', () => {
            console.log(`❌ ${name} timeout - no response after 5s`); // Fixed: 5s not 3s
            req.destroy();
            resolve(false);
        });
    });
}

async function main() {
    console.log('\n🔍 Server Check');
    console.log('----------------');
    console.log('Testing connections to:');
    console.log(`Main API: http://${API_HOST}:${API_PORT}`);
    console.log(`Matcher: http://${API_HOST}:${MATCH_PORT}\n`);

    // Check main API
    await checkEndpoint(API_HOST, API_PORT, '/api/health', 'Main API Server');
    
    // Check matcher
    await checkEndpoint(API_HOST, MATCH_PORT, '/match-providers', 'Provider Matcher');

    // Print help
    console.log('\n📋 Troubleshooting:');
    console.log('1. Check if servers are running:');
    console.log('   Main API: cd server && npm start');
    console.log('   Matcher: cd road-assist-geo-python && python app.py');
    console.log('\n2. Get your machine\'s IP:');
    console.log('   Run: ipconfig | Select-String "IPv4"');
    console.log('\n3. Update API_HOST in config:');
    console.log('   Edit: road-assist-userside/config/api.js');
}

main().catch(console.error);