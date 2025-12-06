require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2');

// Parse DATABASE_URL if available (Railway format)
let dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 2, // Reduced for Railway
  queueLimit: 0,
  connectTimeout: 20000, // 20 seconds
  // Additional Railway-specific options
  ssl: false, // Railway handles SSL internally
  timezone: '+00:00'
};

if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  dbConfig = {
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1), // Remove leading /
    port: url.port,
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0,
    connectTimeout: 20000,
    ssl: false,
    timezone: '+00:00'
  };
}

// Create connection pool
const pool = mysql.createPool(dbConfig);

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
      console.log('✅ Database connected successfully to Railway');
      connection.release();
    }
  });
}

testConnection();

module.exports = promisePool;
