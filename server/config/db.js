// server/config/db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: '127.0.0.1',  // Use explicit IP instead of localhost
  user: 'root',
  password: 'Z!mb@2003',
  database: 'road_assistance_app',
  connectTimeout: 10000 // 10 seconds
});

db.connect((err) => {
  if (err) throw err;
  console.log('🟢 Connected to MySQL');
});

module.exports = db;
