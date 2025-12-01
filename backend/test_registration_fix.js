const { User, Veterinarian } = require('./models/User');
const db = require('./config/database');

async function testRegistration() {
    try {
        console.log('--- Testing Veterinarian Registration ---');

        const email = `testvet_${Date.now()}@example.com`;
        const password = 'password123';
        const fullName = 'Test Vet';
        const role = 'veterinarian';
        const license = `LIC-${Date.now()}`;

        console.log(`Registering user: ${email}`);

        // 1. Create User
        const userId = await User.create({
            email,
            password,
            display_name: fullName,
            role
        });
        console.log(`User created with ID: ${userId}`);

        // 2. Create Veterinarian
        const vetId = await Veterinarian.create({
            user_id: userId,
            vet_name: fullName,
            license_number: license,
            phone: '1234567890',
            state: 'Test State',
            district: 'Test District'
        });
        console.log(`Veterinarian profile created with ID: ${vetId}`);

        // 3. Verify
        const vet = await Veterinarian.getByUserId(userId);
        console.log('Fetched Veterinarian:', vet);

        if (vet && vet.vet_name === fullName && vet.license_number === license) {
            console.log('✅ Registration Test PASSED');
        } else {
            console.error('❌ Registration Test FAILED: Data mismatch');
        }

    } catch (err) {
        console.error('❌ Registration Test FAILED:', err);
    } finally {
        process.exit();
    }
}

testRegistration();
