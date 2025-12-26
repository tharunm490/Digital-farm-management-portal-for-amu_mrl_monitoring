const axios = require('axios');

(async () => {
    try {
        console.log('=== Testing Vet Assignment API ===\n');

        // Step 1: Login as farmer
        console.log('1. Logging in as farmer...');
        let loginResponse;
        try {
            loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
                email: 'farmer@test.com',
                password: 'password123'
            });
            console.log('✓ Login successful');
        } catch (err) {
            console.log('❌ Login failed, trying alternate credentials...');
            try {
                loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
                    email: 'testfarmer@example.com',
                    password: 'password123'
                });
                console.log('✓ Login successful with alternate credentials');
            } catch (err2) {
                console.log('❌ Both login attempts failed');
                console.log('Available farmers - check database for credentials');
                return;
            }
        }

        const token = loginResponse.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // Step 2: Get farmer's farms
        console.log('\n2. Getting farmer farms...');
        const farmsResponse = await axios.get('http://localhost:5000/api/farms', config);
        const farms = farmsResponse.data.data || farmsResponse.data;
        console.log(`✓ Found ${farms.length} farm(s)`);

        if (farms.length === 0) {
            console.log('❌ No farms found for this farmer');
            return;
        }

        const testFarm = farms[0];
        console.log(`   Testing with: ${testFarm.farm_name} (ID: ${testFarm.farm_id})`);

        // Step 3: Check vet assignment (THIS IS THE KEY TEST)
        console.log('\n3. Checking vet assignment...');
        const vetResponse = await axios.get(`http://localhost:5000/api/vet-farm-mapping/farm/${testFarm.farm_id}/vet`);
        console.log('API Response:', JSON.stringify(vetResponse.data, null, 2));

        if (vetResponse.data.hasVet) {
            console.log('\n✅ SUCCESS! Vet is assigned!');
            console.log(`   Vet Name: ${vetResponse.data.vet.vet_name}`);
            console.log(`   Vet ID: ${vetResponse.data.vet.vet_id}`);
            console.log('\n🎉 The "No veterinarians available" warning should be GONE!');
        } else {
            console.log('\n❌ PROBLEM: No vet assigned');
            console.log('   Trying auto-assign...');

            const autoAssignResponse = await axios.post(`http://localhost:5000/api/vet-farm-mapping/auto-assign/${testFarm.farm_id}`);
            console.log('Auto-assign result:', autoAssignResponse.data);
        }

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        if (err.response) {
            console.error('Response:', err.response.data);
        }
    }
})();
