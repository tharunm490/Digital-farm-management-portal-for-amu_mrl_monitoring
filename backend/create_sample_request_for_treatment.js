const Treatment = require('./models/Treatment');
const db = require('./config/database');

async function run() {
  try {
    const treatmentId = 1;
    const [rows] = await db.execute('SELECT amu_id FROM amu_records WHERE treatment_id = ? ORDER BY created_at DESC LIMIT 1', [treatmentId]);
    if (!rows || rows.length === 0) {
      console.error('No AMU record found for treatment', treatmentId);
      return process.exit(1);
    }
    const amuId = rows[0].amu_id;
    console.log('Found amuId', amuId);
    const sr = await Treatment.autoAssignLabAndCreateSample(amuId, treatmentId);
    console.log('Sample request created:', sr);
  } catch (e) {
    console.error('ERROR', e && e.message ? e.message : e);
  } finally {
    try { await db.end(); } catch (_) {}
    process.exit();
  }
}

run();
