const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    const [result] = await conn.execute('SHOW CREATE TABLE users');
    console.log(result[0]['Create Table']);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await conn.end();
    process.exit();
  }
})();
