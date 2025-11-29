const axios = require('axios');

async function createAuthorityUser() {
    try {
        console.log('=== Creating Authority User ===\n');

        const registerData = {
            email: 'browser_test_authority@example.com',
            password: 'password123',
            display_name: 'Test Authority',
            role: 'authority',
            phone: '9876543210',
            state: 'Karnataka',
            district: 'Bangalore',
            taluk: 'Bangalore North'
        };

        const registerRes = await axios.post(
            'http://localhost:5000/api/auth/register',
            registerData
        );

        console.log('✅ Authority user created successfully!');
        console.log('User ID:', registerRes.data.user.user_id);
        console.log('Email:', registerRes.data.user.email);
        console.log('Role:', registerRes.data.user.role);

        // Now test login
        console.log('\n=== Testing Login ===');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'browser_test_authority@example.com',
            password: 'password123'
        });

        console.log('✅ Login successful!');
        const token = loginRes.data.token;

        // Test dashboard stats
        console.log('\n=== Testing Dashboard Stats ===');
        try {
            const statsRes = await axios.get(
                'http://localhost:5000/api/authority/dashboard-stats',
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('✅ Stats endpoint working');
            console.log(JSON.stringify(statsRes.data, null, 2));
        } catch (e) {
            console.log('❌ Stats endpoint error:', e.response?.data || e.message);
        }

        // Test farms access
        console.log('\n=== Testing Farms Access ===');
        const farmsRes = await axios.get(
            'http://localhost:5000/api/farms',
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log(`✅ Can access ${farmsRes.data.length} farms`);

        console.log('\n✅ Authority user setup complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        process.exit(1);
    }
}

createAuthorityUser();
