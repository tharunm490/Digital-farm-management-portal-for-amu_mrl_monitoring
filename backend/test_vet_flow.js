const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let token = '';
let requestId = '';

async function login() {
    try {
        console.log('Logging in as Vet...');
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            email: "testvet@example.com",
            password: "password123"
        });
        token = res.data.token;
        console.log('Vet Login successful.');
        return true;
    } catch (err) {
        console.error('Vet Login failed:', err.response ? err.response.data : err.message);
        return false;
    }
}

async function checkRequests() {
    try {
        console.log('Checking Treatment Requests...');
        const res = await axios.get(`${BASE_URL}/treatment-requests`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Requests found:', res.data.length);
        if (res.data.length > 0) {
            // Find a pending request
            const pending = res.data.find(r => r.status === 'pending');
            if (pending) {
                requestId = pending.request_id;
                console.log('Found pending request:', requestId);
                return true;
            } else {
                console.log('No pending requests found.');
                const approved = res.data.find(r => r.status === 'approved');
                if (approved) {
                    requestId = approved.request_id;
                    console.log('Found approved request, proceeding to record treatment:', requestId);
                    return true;
                }
                return false;
            }
        }
        return false;
    } catch (err) {
        console.error('Check Requests failed:', err.response ? err.response.data : err.message);
        return false;
    }
}

async function approveRequest() {
    if (!requestId) return;
    try {
        console.log('Approving Request...');
        const res = await axios.post(`${BASE_URL}/treatment-requests/${requestId}/approve-and-treat`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Request approved:', res.data);
        return true;
    } catch (err) {
        console.error('Approve Request failed:', err.response ? err.response.data : err.message);
        return false;
    }
}

async function recordTreatment() {
    // To record a treatment, we usually need entity_id, medicine, etc.
    // The previous step "approve-and-treat" might have just changed status.
    // Let's check if there is a separate "Record Treatment" API.
    // Based on prompt: "Record Treatment: [Connects to Farmer] Log treatments administered during visits."
    // This usually maps to POST /api/treatments or similar.

    // I'll assume I need to fetch the request details to get entity_id
    try {
        console.log('Recording Treatment...');

        // Fetch request details to get entity_id
        const reqRes = await axios.get(`${BASE_URL}/treatment-requests/${requestId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const entityId = reqRes.data.entity_id;
        const farmId = reqRes.data.farm_id;

        const res = await axios.post(`${BASE_URL}/vet-treatments/farm/${farmId}/record`, {
            entity_id: entityId,
            medicine: "Antibiotic X",
            medication_type: "Antibiotic",
            dosage: "10",
            dose_unit: "ml",
            frequency_per_day: 1,
            duration_days: 3,
            route: "IM",
            reason: "Fever",
            diagnosis: "Fever",
            application_date: new Date().toISOString().split('T')[0],
            withdrawal_period_days: 7,
            is_vaccine: false
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Treatment recorded:', res.data);
        return true;
    } catch (err) {
        console.error('Record Treatment failed:');
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('Error:', err.message);
        }
        return false;
    }
}

async function run() {
    if (await login()) {
        if (await checkRequests()) {
            await approveRequest();
            await recordTreatment();
        }
    }
}

run();
