const db = require('./config/database');

async function showTable() {
  try {
    const [result] = await db.query('SHOW CREATE TABLE users');
    console.log(result[0]['Create Table']);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    process.exit();
  }
}

showTable();
