// server/config/db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Z!mb@2003',           // replace if your MySQL has a password
  database: 'road_assist_db'
});

db.connect((err) => {
  if (err) throw err;
  console.log('🟢 Connected to MySQL');
});

module.exports = db;
