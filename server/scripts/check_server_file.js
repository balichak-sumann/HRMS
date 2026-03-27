const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const API_URL = 'http://localhost:5001/api';

async function check() {
    try {
        console.log('--- Generating Token ---');
        const payload = { id: '02c5cc57-d28b-4481-96b4-859834d72654', email: 'admin1@iit.org.in', role: 'admin' };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        console.log('--- Requesting debug-file ---');
        const res = await axios.get(`${API_URL}/performance/debug-file`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        fs.writeFileSync('/tmp/server_controller.js', res.data);
        console.log('Server file saved to /tmp/server_controller.js');
        
        // Let's check for the HERO string
        if (res.data.includes('HERO')) {
            console.log('Found HERO in server file!');
        } else {
            console.log('HERO NOT FOUND in server file.');
        }

    } catch (err) {
        console.error('Check failed:', err.message);
    }
}

check();
