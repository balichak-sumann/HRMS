const http = require('http');

const BASE_URL = 'http://localhost:5001/api';
let testResults = {
    modules: {},
    totalPassed: 0,
    totalFailed: 0
};

let hr_token = null;
let emp_token = null;

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
                    resolve({ status: res.statusCode, data: null, raw: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function test(module, name, fn) {
    if (!testResults.modules[module]) {
        testResults.modules[module] = { passed: 0, failed: 0, tests: [] };
    }

    try {
        await fn();
        testResults.modules[module].passed++;
        testResults.totalPassed++;
        testResults.modules[module].tests.push({ name, status: 'PASS', error: null });
        console.log(`  ✓ ${name}`);
    } catch (err) {
        testResults.modules[module].failed++;
        testResults.totalFailed++;
        testResults.modules[module].tests.push({ name, status: 'FAIL', error: err.message });
        console.log(`  ✗ ${name}`);
        console.log(`    → ${err.message}`);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

function assertExists(value, message) {
    if (!value) {
        throw new Error(`${message}: missing value`);
    }
}

async function runTests() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   IndusInnovate HR Suite - Complete QA Test Report        ║');
    console.log('║         End-to-End Testing (All Modules)                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // ===== LOGIN & SETUP =====
    console.log('🔐 AUTHENTICATION SETUP\n');

    const hrLogin = await makeRequest('POST', `${BASE_URL}/auth/login`, {
        email: 'balichak.suman@iit.org.in',
        password: '12345678'
    });

    assertEqual(hrLogin.status, 200, 'HR Login status');
    hr_token = hrLogin.data.token;
    assertExists(hr_token, 'HR token');
    console.log('  ✓ HR Login: balichak.suman@iit.org.in');

    const empLogin = await makeRequest('POST', `${BASE_URL}/auth/login`, {
        email: 'balichaksumann@gmail.com',
        password: '12345678'
    });

    assertEqual(empLogin.status, 200, 'Employee Login status');
    emp_token = empLogin.data.token;
    assertExists(emp_token, 'Employee token');
    console.log('  ✓ Employee Login: balichaksumann@gmail.com\n');

    // ===== AUTH & SECURITY TESTS =====
    console.log('🔒 AUTH & SECURITY TESTS\n');
    
    await test('AUTH', 'Login with correct HR credentials', async () => {
        const res = await makeRequest('POST', `${BASE_URL}/auth/login`, {
            email: 'balichak.suman@iit.org.in',
            password: '12345678'
        });
        assertEqual(res.status, 200, 'Status');
        assertExists(res.data.token, 'Token present');
    });

    await test('AUTH', 'Login with correct employee credentials', async () => {
        const res = await makeRequest('POST', `${BASE_URL}/auth/login`, {
            email: 'balichaksumann@gmail.com',
            password: '12345678'
        });
        assertEqual(res.status, 200, 'Status');
        assertExists(res.data.token, 'Token present');
    });

    await test('AUTH', 'Wrong password rejected (400)', async () => {
        const res = await makeRequest('POST', `${BASE_URL}/auth/login`, {
            email: 'balichak.suman@iit.org.in',
            password: 'wrongpassword'
        });
        assertEqual(res.status, 400, 'Status for wrong password');
    });

    await test('AUTH', 'GET /auth/me returns user profile', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/auth/me`, null, hr_token);
        assertEqual(res.status, 200, 'Status');
        assertEqual(res.data.email, 'balichak.suman@iit.org.in', 'Email matches');
        assertEqual(res.data.role, 'hr', 'Role is hr');
    });

    await test('AUTH', 'Request without token returns 401', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/auth/me`);
        assertEqual(res.status, 401, 'Status without auth');
    });

    await test('AUTH', 'Employee denied HR-only route (403)', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/helpdesk/hr/all`, null, emp_token);
        assertEqual(res.status, 403, 'Status forbidden');
    });

    // ===== EMPLOYEE MANAGEMENT =====
    console.log('\n👥 EMPLOYEE MANAGEMENT\n');

    await test('EMPLOYEES', 'HR can GET /employees list', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/employees`, null, hr_token);
        assertEqual(res.status, 200, 'Status');
        // Response is array, not wrapped
        if (!Array.isArray(res.data)) {
            // Check if it's wrapped in data property
            assertExists(res.data.data || Array.isArray(res.data), 'Has employee list');
        }
    });

    await test('EMPLOYEES', 'Employee can see employee list', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/employees`, null, emp_token);
        assertEqual(res.status, 200, 'Status');
    });

    // ===== DEPARTMENTS =====
    console.log('\n🏢 DEPARTMENTS\n');

    await test('DEPARTMENTS', 'HR can GET /departments', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/departments`, null, hr_token);
        assertEqual(res.status, 200, 'Status');
    });

    // ===== ATTENDANCE =====
    console.log('\n⏰ ATTENDANCE\n');

    await test('ATTENDANCE', 'Employee can check-in', async () => {
        const res = await makeRequest('POST', `${BASE_URL}/attendance/check-in`, {}, emp_token);
        if (res.status !== 200 && res.status !== 400) {
            throw new Error(`Expected 200 or 400 (already checked in), got ${res.status}`);
        }
    });

    await test('ATTENDANCE', 'Employee can check-out', async () => {
        const res = await makeRequest('POST', `${BASE_URL}/attendance/check-out`, {}, emp_token);
        if (res.status !== 200 && res.status !== 400) {
            throw new Error(`Expected 200 or 400, got ${res.status}`);
        }
    });

    await test('ATTENDANCE', 'HR can GET /attendance/all', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/attendance/all`, null, hr_token);
        assertEqual(res.status, 200, 'Status');
    });

    await test('ATTENDANCE', 'Employee can GET /attendance/my', async () => {
        const res =  await makeRequest('GET', `${BASE_URL}/attendance/my`, null, emp_token);
        assertEqual(res.status, 200, 'Status');
    });

    // ===== LEAVES =====
    console.log('\n🏖️  LEAVES\n');

    await test('LEAVES', 'Get leaves (both roles)', async () => {
        const hrRes = await makeRequest('GET', `${BASE_URL}/leaves`, null, hr_token);
        const empRes = await makeRequest('GET', `${BASE_URL}/leaves`, null, emp_token);
        assertEqual(hrRes.status, 200, 'HR can get leaves');
        assertEqual(empRes.status, 200, 'Employee can get leaves');
    });

    // ===== PAYROLL =====
    console.log('\n💰 PAYROLL & TAX\n');

    await test('PAYROLL', 'GET /payroll/statutory-settings requires HR', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/payroll/statutory-settings`, null, hr_token);
        assertEqual(res.status, 200, 'HR can access');
    });

    await test('PAYROLL', 'Employee denied /payroll/statutory-settings (403)', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/payroll/statutory-settings`, null, emp_token);
        assertEqual(res.status, 403, 'Forbidden');
    });

    await test('PAYROLL', 'HR can GET /payroll records', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/payroll`, null, hr_token);
        assertEqual(res.status, 200, 'Status');
    });

    // ===== PERFORMANCE =====
    console.log('\n⭐ PERFORMANCE\n');

    await test('PERFORMANCE', 'GET /performance/cycles', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/performance/cycles`, null, hr_token);
        assertEqual(res.status, 200, 'Status');
    });

    // ===== SURVEYS =====
    console.log('\n📋 SURVEYS\n');

    await test('SURVEYS', 'GET /surveys (employee can see)', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/surveys`, null, emp_token);
        assertEqual(res.status, 200, 'Status');
    });

    // ===== HELPDESK =====
    console.log('\n🎫 HELPDESK\n');

    await test('HELPDESK', 'HR can access /helpdesk/hr/all', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/helpdesk/hr/all`, null, hr_token);
        assertEqual(res.status, 200, 'Status');
    });

    await test('HELPDESK', 'Employee denied /helpdesk/hr/all (403)', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/helpdesk/hr/all`, null, emp_token);
        assertEqual(res.status, 403, 'Forbidden');
    });

    await test('HELPDESK', 'Employee can GET /helpdesk/my/tickets', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/helpdesk/my/tickets`, null, emp_token);
        assertEqual(res.status, 200, 'Status');
    });

    // ===== AUDIT & ANALYTICS =====
    console.log('\n📊 AUDIT & ANALYTICS\n');

    await test('AUDIT', 'HR can GET /audit', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/audit`, null, hr_token);
        assertEqual(res.status, 200, 'Status');
    });

    await test('AUDIT', 'Employee denied /audit (403)', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/audit`, null, emp_token);
        assertEqual(res.status, 403, 'Forbidden');
    });

    await test('ANALYTICS', 'HR can GET /analytics', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/analytics`, null, hr_token);
        assertEqual(res.status, 200, 'Status');
    });

    await test('ANALYTICS', 'Employee denied /analytics (403)', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/analytics`, null, emp_token);
        assertEqual(res.status, 403, 'Forbidden');
    });

    // ===== CHAT & COLLABORATION =====
    console.log('\n💬 CHAT & COLLABORATION\n');

    await test('CHAT', 'Employee can GET /chat/contacts', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/chat/contacts`, null, emp_token);
        assertEqual(res.status, 200, 'Status');
    });

    await test('CHAT', 'Employee can GET /chat/groups', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/chat/groups`, null, emp_token);
        assertEqual(res.status, 200, 'Status');
    });

    // ===== NOTIFICATIONS =====
    console.log('\n🔔 NOTIFICATIONS\n');

    await test('NOTIFICATIONS', 'Employee can GET /notifications', async () => {
        const res = await makeRequest('GET', `${BASE_URL}/notifications`, null, emp_token);
        assertEqual(res.status, 200, 'Status');
    });

    // ===== GENERATE REPORT =====
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   TEST SUMMARY REPORT                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const table = [
        ['Module', 'Passed', 'Failed', 'Total', 'Success %']
    ];

    for (const [module, results] of Object.entries(testResults.modules)) {
        const total = results.passed + results.failed;
        const percent = total > 0 ? ((results.passed / total) * 100).toFixed(0) : '0';
        table.push([module, String(results.passed), String(results.failed), String(total), `${percent}%`]);
    }

    // Print table
    const colWidths = [15, 10, 10, 10, 12];
    for (const row of table) {
        const formatted = row
            .map((cell, i) => cell.toString().padEnd(colWidths[i]))
            .join(' | ');
        console.log(formatted);
        if (row[0] === 'Module') {
            console.log(colWidths.map(w => '─'.repeat(w)).join('─┼─'));
        }
    }

    console.log(`\n📈 OVERALL RESULTS:`);
    console.log(`   Total Tests: ${testResults.totalPassed + testResults.totalFailed}`);
    console.log(`   Passed:      ${testResults.totalPassed}`);
    console.log(`   Failed:      ${testResults.totalFailed}`);
    const overallPercent = testResults.totalPassed + testResults.totalFailed > 0
        ? ((testResults.totalPassed / (testResults.totalPassed + testResults.totalFailed)) * 100).toFixed(2)
        : '0';
    console.log(`   Success:     ${overallPercent}%\n`);

    if (testResults.totalFailed > 0) {
        console.log('\n⚠️  FAILED TESTS:\n');
        for (const [module, results] of Object.entries(testResults.modules)) {
            const failed = results.tests.filter(t => t.status === 'FAIL');
            if (failed.length > 0) {
                console.log(`  ${module}:`);
                for (const test of failed) {
                    console.log(`    • ${test.name}`);
                    console.log(`      ${test.error}\n`);
                }
            }
        }
    }

    process.exit(testResults.totalFailed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
