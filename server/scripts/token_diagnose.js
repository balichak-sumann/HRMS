const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const API_URL = 'http://localhost:5001/api';

async function diagnose() {
    try {
        console.log('--- Generating Token ---');
        // Data from check_profiles: { id: '02c5cc57-d28b-4481-96b4-859834d72654', email: 'admin1@iit.org.in', role: 'admin' }
        const payload = {
            id: '02c5cc57-d28b-4481-96b4-859834d72654',
            email: 'admin1@iit.org.in',
            role: 'admin',
            name: 'O' 
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        console.log('Token generated.');

        console.log('--- Calling Dashboard API ---');
        const dashRes = await axios.get(`${API_URL}/performance/dashboard`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Response Status:', dashRes.status);
        console.log('Full Response:', JSON.stringify(dashRes.data, null, 2));
    } catch (err) {
        console.error('Diagnosis Failed:', err.response?.data || err.message);
    }
}

diagnose();
