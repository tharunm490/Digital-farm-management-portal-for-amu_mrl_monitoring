const http = require('http');

function makeRequest(method, path, token, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: `/api${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function test() {
    try {
        console.log('=== TESTING TREATMENT WORKFLOW ===\n');

        // 1. Login
        console.log('1. Logging in...');
        const loginData = await makeRequest('POST', '/auth/login', null, {
            email: 'farmer@test.com',
            password: 'farmer123'
        });

        if (!loginData.token) {
            console.error('❌ Login failed:', loginData);
            process.exit(1);
        }

        const token = loginData.token;
        const userId = loginData.user.user_id;
        console.log('✅ Logged in, user_id:', userId);

        // 2. Get AMU records
        console.log('\n2. Fetching AMU records...');
        const amuData = await makeRequest('GET', '/amu', token);
        console.log('✅ AMU Records:', Array.isArray(amuData) ? amuData.length : 'Error');
        if (Array.isArray(amuData) && amuData.length > 0) {
            console.log('   First record:', amuData[0]);
        }

        // 3. Get notifications
        console.log('\n3. Fetching notifications...');
        const notifData = await makeRequest('GET', '/notifications', token);
        console.log('✅ Notifications:', Array.isArray(notifData) ? notifData.length : 'Error');
        if (Array.isArray(notifData) && notifData.length > 0) {
            console.log('   First notification:', notifData[0]);
        }

        console.log('\n=== ✅ TEST COMPLETE ===');
        process.exit(0);
    } catch (err) {
        console.error('\n=== ❌ TEST FAILED ===');
        console.error(err);
        process.exit(1);
    }
}

test();
