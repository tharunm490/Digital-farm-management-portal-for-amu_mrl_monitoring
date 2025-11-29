const axios = require('axios');

async function verifyQRBackend() {
    const hash = '08c47d78e3535b940e96587d13f0f8836512967d9f339dc34ad110b5ca0cc858';
    try {
        console.log(`Verifying QR Hash: ${hash}`);
        const response = await axios.get(`http://localhost:5000/api/verify/hash/${hash}`);
        console.log('Verification Successful!');
        console.log('Entity ID:', response.data.entity_details.entity_id);
        console.log('Status:', response.data.withdrawal_info.status);
        console.log('Tamper Proof:', response.data.tamper_proof);
    } catch (error) {
        console.error('Verification Failed:', error.response ? error.response.data : error.message);
    }
}

verifyQRBackend();
