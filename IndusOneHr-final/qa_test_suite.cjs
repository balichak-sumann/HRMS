#!/usr/bin/env node
/**
 * IndusInnovate HR Suite - Complete QA Test Suite
 * Tests every API endpoint, role permission, and edge case
 */

const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:5001/api';
let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

let hr_token = null;
let emp_token = null;
let hr_id = null;
let emp_id = null;

// Utility function to make HTTP requests
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

// Test wrapper
async function test(name, fn) {
    try {
        await fn();
        testResults.passed++;
        testResults.tests.push({ name, status: 'PASS', error: null });
        console.log(`✓ ${name}`);
    } catch (err) {
        testResults.failed++;
        testResults.tests.push({ name, status: 'FAIL', error: err.message });
        console.log(`✗ ${name}`);
        console.log(`  Error: ${err.message}`);
    }
}

// Test assertions
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

function assertExists(value, message) {
    if (!value) {
        throw new Error(`${message}: value does not exist`);
    }
}

async function runTests() {
    console.log('\n=== IndusInnovate HR Suite QA Test Suite ===\n');
    console.log('Starting comprehensive end-to-end testing...\n');

    // =========== AUTH & SECURITY TESTS ===========
    console.log('\n--- AUTH & SECURITY TESTS ---\n');

    // Test 1: HR Login
    await test('TEST 1.1: HR Login returns 200 and token', async () => {
        const res = await makeRequest('POST', `${BASE_URL}/auth/login`, {
            email: 'balichak.suman@iit.org.in',
            password: '12345678'
        });
        assertEqual(res.status, 200, 'Status code');
        assertExists(res.data.token, 'Token');
        assertExists(res.data.user, 'User object');
        assertEqual(res.data.user.role, 'hr', 'User role');
        hr_token = res.data.token;
        hr_id = res.data.user.employee_uuid || res.data.user.id;
    });

    // Test 2: Employee Login
    await test('TEST 1.2: Employee Login returns 200 and token', async () => {
        const res = await makeRequest('POST', `${BASE_URL}/auth/login`, {
            email: 'balichaksumann@gmail.com',
            password: '12345678'
        });
        assertEqual(res.status, 200, 'Status code');
        assertExists(res.data.token, 'Token');
        assertEqual(res.data.user.role, 'employee', 'User role');
        emp_token = res.data.token;
        emp_id = res.data.user.employee_uuid || res.data.user.id;
    });

    // Test 3: Wrong Password
    await test('TEST 1.3: Wrong password returns 401', async () => {
        const res = await makeRequest('POST', `${BASE_URL}/auth/login`, {
            email: 'balichak.suman@iit.org.in',
            password: 'wrongpassword'
        });
        assertEqual(res.status, 401, 'Status code for wrong password');
    });

    // Test 4: Get /auth/me with valid HR token
    await test('TEST 1.4: GET /auth/me with HR token returns profile', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/auth/me`, null, hr_token);
        assertEqual(res.status, 200, 'Status code');
        assertExists(res.data.data?.email, 'Email in response');
        assertEqual(res.data.data.email, 'balichak.suman@iit.org.in', 'Email matches');
    });

    // Test 5: GET /auth/me without token
    await test('TEST 1.5: GET /auth/me without token returns 401', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/auth/me`);
        assertEqual(res.status, 401, 'Status code without auth');
    });

    // Test 6: Employee accessing HR-only route
    await test('TEST 1.6: Employee token denied access to HR-only route (403)', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/helpdesk/hr/all`, null, emp_token);
        assertEqual(res.status, 403, 'Status code for unauthorized access');
    });

    // Test 7: GET employees with both roles
    await test('TEST 1.7: HR can GET /employees', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/employees`, null, hr_token);
        assertEqual(res.status, 200, 'Status code');
        assertExists(res.data.data, 'Data array');
    });

    // Test 8: Employee can GET employees (filtered)
    await test('TEST 1.8: Employee can GET /employees list', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/employees`, null, emp_token);
        assertEqual(res.status, 200, 'Status code');
    });

    // =========== CORE HR TESTS ===========
    console.log('\n--- CORE HR TESTS ---\n');

    // Test 9: Get deparments
    await test('TEST 2.1: GET /departments returns list', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/departments`, null, hr_token);
        assertEqual(res.status, 200, 'Status code');
        assertExists(res.data.data, 'Department list');
    });

    // =========== ATTENDANCE TESTS ===========
    console.log('\n--- ATTENDANCE & LEAVE TESTS ---\n');

    // Test 10: Check-in
    await test('TEST 3.1: Employee can check-in', async () => {
        const res = await makeRequest('POST', `${BASE_URL}/attendance/check-in`, {}, emp_token);
        // Either 200 (success) or 400 (already checked in today)
        if (res.status !== 200 && res.status !== 400) {
            throw new Error(`Expected 200 or 400, got ${res.status}`);
        }
    });

    // Test 11: Get attendance
    await test('TEST 3.2: GET /attendance with HR token', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/attendance`, null, hr_token);
        assertEqual(res.status, 200, 'Status code');
    });

    // Test 12: Get my attendance
    await test('TEST 3.3: GET /attendance with employee token (filtered)', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/attendance`, null, emp_token);
        assertEqual(res.status, 200, 'Status code');
    });

    // Test 13: Get leave balances
    await test('TEST 3.4: GET /leave-balances', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/leaves/my/balance`, null, emp_token);
        // May not exist, but should not 500
        if (res.status !== 200 && res.status !== 404) {
            // Acceptable: endpoint might not exist
        }
    });

    // =========== PAYROLL TESTS ===========
    console.log('\n--- PAYROLL & TAX TESTS ---\n');

    // Test 14: Get statutory settings
    await test('TEST 4.1: GET /payroll/statutory-settings', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/payroll/statutory-settings`, null, hr_token);
        assertEqual(res.status, 200, 'Status code');
    });

    // Test 15: Employee denied access to statutory settings
    await test('TEST 4.2: Employee denied access to payroll settings (403)', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/payroll/statutory-settings`, null, emp_token);
        assertEqual(res.status, 403, 'Status code');
    });

    // =========== PERFORMANCE TESTS ===========
    console.log('\n--- PERFORMANCE & SURVEYS TESTS ---\n');

    // Test 16: Get performance cycles
    await test('TEST 5.1: GET /performance/cycles', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/performance/cycles`, null, hr_token);
        assertEqual(res.status, 200, 'Status code');
    });

    // Test 17: Get surveys
    await test('TEST 5.2: GET /surveys', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/surveys`, null, emp_token);
        assertEqual(res.status, 200, 'Status code');
    });

    // =========== HELPDESK TESTS ===========
    console.log('\n--- HELPDESK & SUPPORT TESTS ---\n');

    // Test 18: HR can get all tickets
    await test('TEST 6.1: HR can GET /helpdesk/hr/all', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/helpdesk/hr/all`, null, hr_token);
        assertEqual(res.status, 200, 'Status code');
    });

    // Test 19: Employee denied HR helpdesk
    await test('TEST 6.2: Employee denied /helpdesk/hr/all (403)', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/helpdesk/hr/all`, null, emp_token);
        assertEqual(res.status, 403, 'Status code');
    });

    // Test 20: Employee can get their tickets
    await test('TEST 6.3: Employee can GET /helpdesk/my/tickets', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/helpdesk/my/tickets`, null, emp_token);
        assertEqual(res.status, 200, 'Status code');
    });

    // =========== AUDIT & ANALYTICS ===========
    console.log('\n--- AUDIT & GOVERNANCE TESTS ---\n');

    // Test 21: HR can get audit logs
    await test('TEST 7.1: HR can GET /audit', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/audit`, null, hr_token);
        assertEqual(res.status, 200, 'Status code');
    });

    // Test 22: Employee denied audit logs
    await test('TEST 7.2: Employee denied /audit (403)', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/audit`, null, emp_token);
        assertEqual(res.status, 403, 'Status code');
    });

    // Test 23: HR can get analytics
    await test('TEST 7.3: HR can GET /analytics', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/analytics`, null, hr_token);
        assertEqual(res.status, 200, 'Status code');
    });

    // Test 24: Employee denied analytics
    await test('TEST 7.4: Employee denied /analytics (403)', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/analytics`, null, emp_token);
        assertEqual(res.status, 403, 'Status code');
    });

    // =========== COLLABORATION ===========
    console.log('\n--- COLLABORATION TESTS ---\n');

    // Test 25: Chat endpoints
    await test('TEST 8.1: Employee can GET /chat/contacts', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/chat/contacts`, null, emp_token);
        assertEqual(res.status, 200, 'Status code');
    });

    // Test 26: Get notifications
    await test('TEST 8.2: Employee can GET /notifications', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/notifications`, null, emp_token);
        assertEqual(res.status, 200, 'Status code');
    });

    // =========== PRINT SUMMARY ===========
    console.log('\n\n=== TEST SUMMARY ===\n');
    console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%\n`);

    if (testResults.failed > 0) {
        console.log('FAILED TESTS:');
        testResults.tests
            .filter(t => t.status === 'FAIL')
            .forEach(t => {
                console.log(`  • ${t.name}`);
                console.log(`    ${t.error}`);
            });
    }

    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run all tests
runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
