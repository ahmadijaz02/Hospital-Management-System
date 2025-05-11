const mysql = require('mysql2/promise');
require('dotenv').config();

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Add retry strategy for Docker environment
  connectTimeout: 10000, // 10 seconds
  acquireTimeout: 10000, // 10 seconds
});

// Test the connection with retry logic
const testConnection = async (retries = 5, delay = 5000) => {
  let attempts = 0;

  const tryConnect = async () => {
    try {
      const connection = await pool.getConnection();
      console.log('MySQL connection established successfully.');
      connection.release();
      return true;
    } catch (err) {
      attempts++;
      console.error(`Unable to connect to the MySQL database (attempt ${attempts}/${retries}):`, err);

      if (attempts >= retries) {
        console.error('Max connection attempts reached. Giving up.');
        return false;
      }

      console.log(`Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return tryConnect();
    }
  };

  return tryConnect();
};

// Initial connection test
testConnection();

module.exports = pool;
