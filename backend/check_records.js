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
        console.log('CHECKING RECORDS...\n');

        // Login Farmer
        const l = await req('POST', '/auth/login', null, { email: 'farmer@test.com', password: 'farmer123' });
        console.log('✅ Logged in');

        // Get AMU
        const amu = await req('GET', '/amu', l.token);
        const amuList = amu.data || amu;

        console.log(`✅ Total AMU Records: ${amuList.length}`);

        if (amuList.length > 0) {
            console.log('\nRecent Records:');
            amuList.slice(0, 5).forEach(r => {
                console.log(`- ${r.species}: ${r.medicine} (${r.dose_amount} ${r.dose_unit})`);
            });
        }

    } catch (e) {
        console.log('\n❌ FAILED:', e.error || e);
    }
})();
