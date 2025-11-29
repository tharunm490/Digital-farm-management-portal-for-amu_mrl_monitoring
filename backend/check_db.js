const mysql = require('mysql2/promise');

async function check() {
  const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'd'
  });

  try {
    const [vaccHistory] = await db.execute('SELECT COUNT(*) as count FROM vaccination_history');
    const [treatments] = await db.execute('SELECT COUNT(*) as count FROM treatment_records WHERE medication_type = "vaccine"');
    const [notifications] = await db.execute('SELECT COUNT(*) as count FROM notification_history WHERE type = "vaccination"');

    console.log('Vaccination history records:', vaccHistory[0].count);
    console.log('Vaccine treatments:', treatments[0].count);
    console.log('Vaccination notifications:', notifications[0].count);

    if (vaccHistory[0].count === 0) {
      console.log('No vaccination history found. Checking if there are any treatments...');
      const [allTreatments] = await db.execute('SELECT COUNT(*) as count FROM treatment_records');
      console.log('Total treatments:', allTreatments[0].count);

      if (allTreatments[0].count > 0) {
        const [sample] = await db.execute('SELECT medication_type, medicine FROM treatment_records LIMIT 5');
        console.log('Sample treatments:', sample);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

check();