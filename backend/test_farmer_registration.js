const { User, Farmer } = require('./models/User');
const db = require('./config/database');

async function testFarmerRegistration() {
    try {
        console.log('--- Testing Farmer Registration ---');

        // User provided data
        const email = `farmer3_${Date.now()}@test.com`; // Unique email
        const password = 'password123';
        const fullName = 'testfarmer';
        const role = 'farmer';
        const phone = 'Enter your phone number'; // As per user input
        const address = 'Enter your address';
        const state = 'Karnataka';
        const district = 'Dakshina Kannada';

        console.log(`Registering user: ${email}`);

        // 1. Create User
        const userId = await User.create({
            email,
            password,
            display_name: fullName,
            role
        });
        console.log(`User created with ID: ${userId}`);

        // 2. Create Farmer
        const farmerId = await Farmer.create({
            user_id: userId,
            phone,
            address,
            state,
            district
        });
        console.log(`Farmer profile created with ID: ${farmerId}`);

        // 3. Verify
        const farmer = await Farmer.getByUserId(userId);
        console.log('Fetched Farmer:', farmer);

        if (farmer && farmer.state === state && farmer.district === district) {
            console.log('✅ Farmer Registration Test PASSED');
        } else {
            console.error('❌ Farmer Registration Test FAILED: Data mismatch');
        }

    } catch (err) {
        console.error('❌ Farmer Registration Test FAILED:', err);
    } finally {
        process.exit();
    }
}

testFarmerRegistration();
