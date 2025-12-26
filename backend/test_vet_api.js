const axios = require('axios');

(async () => {
    try {
        console.log('Testing vet assignment API...\n');

        // Test 1: Get a farm ID
        console.log('1. Getting farms...');
        const farmsResponse = await axios.get('http://localhost:5000/api/farms');
        const farms = farmsResponse.data.data || farmsResponse.data;

        if (!farms || farms.length === 0) {
            console.log('❌ No farms found');
            return;
        }

        const testFarm = farms[0];
        console.log(`✓ Found farm: ${testFarm.farm_name} (ID: ${testFarm.farm_id})`);

        // Test 2: Check vet assignment for this farm
        console.log(`\n2. Checking vet assignment for farm ${testFarm.farm_id}...`);
        try {
            const vetResponse = await axios.get(`http://localhost:5000/api/vet-farm-mapping/farm/${testFarm.farm_id}/vet`);
            console.log('✓ API Response:', JSON.stringify(vetResponse.data, null, 2));

            if (vetResponse.data.hasVet) {
                console.log(`\n✅ SUCCESS: Vet is assigned!`);
                console.log(`   Vet: ${vetResponse.data.vet.vet_name}`);
            } else {
                console.log(`\n❌ PROBLEM: API says no vet assigned`);
                console.log('   Response:', vetResponse.data);
            }
        } catch (vetError) {
            console.log('❌ API Error:', vetError.response?.data || vetError.message);

            // Try alternate endpoint
            console.log('\n3. Trying alternate endpoint...');
            try {
                const altResponse = await axios.get(`http://localhost:5000/api/vet-farm-mapping/vet-for-farm/${testFarm.farm_id}`);
                console.log('✓ Alternate API Response:', JSON.stringify(altResponse.data, null, 2));
            } catch (altError) {
                console.log('❌ Alternate API also failed:', altError.response?.data || altError.message);
            }
        }

    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Response:', err.response.data);
        }
    }
})();
