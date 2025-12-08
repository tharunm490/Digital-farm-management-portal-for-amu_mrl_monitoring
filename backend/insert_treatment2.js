const db = require('./config/database');

async function run() {
  try {
    const insertSql = `INSERT INTO treatment_records (entity_id,farm_id,user_id,species,medication_type,is_vaccine,vet_id,vet_name,reason,medicine,start_date,end_date,route,dose_amount,dose_unit,frequency_per_day,duration_days,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [
      1, // entity_id
      1, // farm_id
      2, // user_id (vet's user_id)
      'cattle',
      'Antibiotic',
      0,
      'TEMP_1765209504622',
      'Tharun M',
      'Infection',
      'Gentamicin',
      '2025-10-08',
      '2025-10-11',
      'IM',
      4,
      'mg/kg',
      1,
      3,
      'approved'
    ];

    const [res] = await db.query(insertSql, params);
    console.log('INSERT_OK', res.insertId);

    const [rows] = await db.query('SELECT treatment_id,entity_id,vet_id,vet_name,medicine,start_date,end_date,route,dose_amount,dose_unit,frequency_per_day,duration_days,status FROM treatment_records WHERE entity_id = 1 ORDER BY start_date DESC');
    console.log('TREATMENTS:', JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('ERROR', e && e.message ? e.message : e);
  } finally {
    try { await db.end(); } catch (_) {}
    process.exit();
  }
}

run();
