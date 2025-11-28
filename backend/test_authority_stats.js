const http = require('http');

function req(method, path, token, body) {
    return new Promise((resolve, reject) => {
        const opt = {
            hostname: 'localhost', port: 5000, path: `/api${path}`, method,
            headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
        };
        const r = http.request(opt, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try {
                    const p = JSON.parse(d);
                    res.statusCode >= 400 ? reject(p) : resolve(p);
                } catch (e) { res.statusCode >= 400 ? reject(d) : resolve(d); }
            });
        });
        r.on('error', reject);
        if (body) r.write(JSON.stringify(body));
        r.end();
    });
}

(async () => {
    try {
        console.log('TESTING AUTHORITY STATS API...\n');

        // Login
        console.log('1. Logging in...');
        const l = await req('POST', '/auth/login', null, { email: 'authority_test@test.com', password: 'password123' });
        console.log('✅ Login successful');

        // Fetch Stats
        console.log('\n2. Fetching stats...');
        const stats = await req('GET', '/authority/dashboard-stats', l.token);

        console.log('Response:', JSON.stringify(stats, null, 2));

    } catch (e) {
        console.log('\n❌ FAILED:', e.error || e);
    }
})();
