const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5001/api';

async function diagnose() {
    try {
        console.log('--- Attempting Login ---');
        // Let's try to login as admin1@iit.org.in
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin1@iit.org.in',
            password: 'Password@123', // Common password in this repo usually
            requestedRole: 'admin'
        });
        const token = loginRes.data.token;
        console.log('Login successful, token retrieved.');

        console.log('--- Calling Dashboard API ---');
        const dashRes = await axios.get(`${API_URL}/performance/dashboard`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Response Status:', dashRes.status);
        console.log('Response DataKeys:', Object.keys(dashRes.data));
        console.log('All Employees length:', dashRes.data.all_employees?.length);
        console.log('Cycles count:', dashRes.data.dashboard?.length);
        console.log('Sample Data:', JSON.stringify(dashRes.data.dashboard[0]?.name));

    } catch (err) {
        console.error('Diagnosis Failed:', err.response?.data || err.message);
    }
}

diagnose();
