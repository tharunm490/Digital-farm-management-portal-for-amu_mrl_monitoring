const axios = require('axios');

async function testAfterRestart() {
    try {
        console.log('Testing vet-farm mapping API...\n');

        // Test the endpoint
        const response = await axios.get('http://localhost:5000/api/vet-farm-mapping/farm/1');

        console.log('✅ API Response:');
        console.log(JSON.stringify(response.data, null, 2));

        if (response.data.hasVet) {
            console.log('\n🎉 SUCCESS! Vet assignment is working!');
            console.log(`Vet: ${response.data.vet.vet_name}`);
        } else {
            console.log('\n❌ No vet assigned');
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.response?.status === 404) {
            console.log('\n⚠️ Route not found - Backend needs restart!');
            console.log('Please restart the backend server with: npm start');
        }
    }
}

testAfterRestart();
