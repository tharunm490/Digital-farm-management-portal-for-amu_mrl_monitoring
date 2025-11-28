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
        console.log('TESTING AUTHORITY ACCESS...\n');

        // Login as Authority
        console.log('1. Logging in as Authority...');
        const l = await req('POST', '/auth/login', null, { email: 'authority@test.com', password: 'authority123' });
        console.log('✅ Login successful. Role:', l.user.role);

        // Fetch AMU Records
        console.log('\n2. Fetching all AMU records...');
        const amu = await req('GET', '/amu', l.token);
        const amuList = amu.data || amu;

        console.log(`✅ Records found: ${amuList.length}`);

        if (amuList.length > 0) {
            console.log('   Sample Record:');
            console.log('   - Medicine:', amuList[0].medicine);
            console.log('   - Farmer:', amuList[0].farmer_name);
            console.log('   - Farm:', amuList[0].farm_name);
        } else {
            console.log('⚠️  No records found (unexpected if farmer created data)');
        }

        console.log('\n✅ AUTHORITY ACCESS VERIFIED\n');
    } catch (e) {
        console.log('\n❌ FAILED:', e.error || e);
    }
})();
