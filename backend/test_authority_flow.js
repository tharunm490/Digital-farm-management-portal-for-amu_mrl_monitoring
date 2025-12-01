const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let token = '';

async function registerAuthority() {
    try {
        console.log('Registering Authority...');
        const res = await axios.post(`${BASE_URL}/auth/register`, {
            full_name: "Test Authority",
            email: "testauthority@example.com",
            password: "password123",
            role: "authority"
        });
        console.log('Authority Registration successful.');
        return true;
    } catch (err) {
        if (err.response && err.response.data.error === 'User already exists') {
            console.log('Authority already exists.');
            return true;
        }
        console.error('Authority Registration failed:', err.response ? err.response.data : err.message);
        return false;
    }
}

async function login() {
    try {
        console.log('Logging in as Authority...');
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            email: "testauthority@example.com",
            password: "password123"
        });
        token = res.data.token;
        console.log('Authority Login successful.');
        return true;
    } catch (err) {
        console.error('Authority Login failed:', err.response ? err.response.data : err.message);
        return false;
    }
}

async function checkStats() {
    try {
        console.log('Checking National Stats...');
        const res = await axios.get(`${BASE_URL}/authority/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('National Stats:', JSON.stringify(res.data, null, 2));
        return true;
    } catch (err) {
        console.error('Check Stats failed:', err.response ? err.response.data : err.message);
        return false;
    }
}

async function checkFarms() {
    try {
        console.log('Checking All Farms...');
        const res = await axios.get(`${BASE_URL}/farms`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Total Farms:', res.data.data ? res.data.data.length : res.data.length);
        return true;
    } catch (err) {
        console.error('Check Farms failed:', err.response ? err.response.data : err.message);
        return false;
    }
}

async function run() {
    await registerAuthority();
    if (await login()) {
        await checkStats();
        await checkFarms();
    }
}

run();
