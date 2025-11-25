require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2');

// Create connection pool with Railway-optimized settings
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 2, // Reduced for Railway
  queueLimit: 0,
  connectTimeout: 20000, // 20 seconds
  acquireTimeout: 20000, // Valid for pools
  // Additional Railway-specific options
  ssl: false, // Railway handles SSL internally
  timezone: '+00:00'
});

// Get promise-based connection
const promisePool = pool.promise();

// Test connection with retry logic
let connectionAttempts = 0;
const maxAttempts = 3;

function testConnection() {
  pool.getConnection((err, connection) => {
    if (err) {
      connectionAttempts++;
      console.error(`Database connection attempt ${connectionAttempts} failed:`, err.message);
      
      if (connectionAttempts < maxAttempts) {
        console.log(`Retrying in 5 seconds... (${connectionAttempts}/${maxAttempts})`);
        setTimeout(testConnection, 5000);
      } else {
        console.error('Max connection attempts reached. Please check your database configuration.');
      }
    } else {
      console.log('✅ Database connected successfully to Railway/mysql_d');
      connection.release();
    }
  });
}

testConnection();

module.exports = promisePool;
