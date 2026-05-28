const http = require('http');

const BASE_URL = 'http://localhost:5001/api';

function makeRequest(method, url, body = null, authToken = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (authToken) {
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: { raw: data } });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function debug() {
    // Get HR token
    const login = await makeRequest('POST', `${BASE_URL}/auth/login`, {
        email: 'balichak.suman@iit.org.in',
        password: '12345678'
    });

    const hr_token = login.data.token;

    console.log('=== DEBUG: Response Structures ===\n');

    // Test 1: /auth/me structure
    console.log('1. GET /auth/me response:');
    const me = await makeRequest('GET', `${BASE_URL}/auth/me`, null, hr_token);
    console.log(JSON.stringify(me, null, 2));

    // Test 2: /employees structure  
    console.log('\n2. GET /employees response (first 500 chars):');
    const emps = await makeRequest('GET', `${BASE_URL}/employees`, null, hr_token);
    console.log('Status:', emps.status);
    console.log('Keys:', Object.keys(emps.data));
    if (emps.data.data) {
        console.log('Has data.data:', Array.isArray(emps.data.data) ? 'array' : typeof emps.data.data);
    }
    if (emps.data.rows) {
        console.log('Has data.rows:', Array.isArray(emps.data.rows) ? 'array' : typeof emps.data.rows);
    }

    // Test 3: /departments structure
    console.log('\n3. GET /departments response:');
    const depts = await makeRequest('GET', `${BASE_URL}/departments`, null, hr_token);
    console.log('Status:', depts.status);
    console.log('Keys:', Object.keys(depts.data));

    // Test 4: /attendance endpoint
    console.log('\n4. GET /attendance endpoint:');
    const att = await makeRequest('GET', `${BASE_URL}/attendance`, null, hr_token);
    console.log('Status:', att.status);
    console.log('Response:', JSON.stringify(att, null, 2).substring(0, 300));

    // Test 5: Wrong password  
    console.log('\n5. Wrong password status:');
    const wrong = await makeRequest('POST', `${BASE_URL}/auth/login`, {
        email: 'balichak.suman@iit.org.in',
        password: 'wrongpassword'
    });
    console.log('Status:', wrong.status);
    console.log('Response:', JSON.stringify(wrong.data, null, 2));

    process.exit(0);
}

debug().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
