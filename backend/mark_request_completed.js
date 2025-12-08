const db = require('./config/database');

async function run() {
  try {
    const requestId = 1;
    const [res] = await db.query('UPDATE treatment_requests SET status = ? WHERE request_id = ?', ['completed', requestId]);
    console.log('UPDATE_OK', res.affectedRows);

    const [rows] = await db.query('SELECT request_id,entity_id,farm_id,farmer_id,vet_id,status,created_at,updated_at FROM treatment_requests WHERE request_id = ?', [requestId]);
    console.log('REQUEST:', JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('ERROR', e && e.message ? e.message : e);
  } finally {
    try { await db.end(); } catch (_) {}
    process.exit();
  }
}

run();
