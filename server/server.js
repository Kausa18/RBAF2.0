// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./config/db'); // Make sure your MySQL connection is here

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ========== Basic Test Route ==========
app.get('/', (req, res) => {
  res.send('API is running...');
});

// ========== User Signup ==========
app.post('/api/signup', (req, res) => {
  const { name, email, password, phone, role } = req.body;

  const sql = 'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [name, email, password, phone, role], (err, result) => {
    if (err) {
      console.error('Signup error:', err);
      return res.status(500).json({ message: 'Email may already exist' });
    }
    res.status(201).json({ message: 'Signup successful', userId: result.insertId });
  });
});

// ========== User Login ==========
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';

  db.query(sql, [email, password], (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json({ user: results[0] });
  });
});

// ========== Help Request ==========
app.post('/api/request-help', (req, res) => {
  const { latitude, longitude, issue_type, user_id } = req.body;

  if (!latitude || !longitude || !issue_type || !user_id) {
    return res.status(400).json({ message: 'Missing required data' });
  }

  const sql = `
    INSERT INTO requests (user_id, provider_id, issue_type, latitude, longitude)
    VALUES (?, NULL, ?, ?, ?)
  `;

  db.query(sql, [user_id, issue_type, latitude, longitude], (err, result) => {
    if (err) {
      console.error('MySQL error:', err);
      return res.status(500).json({ message: 'Failed to save request' });
    }
    res.status(200).json({ message: 'Request saved successfully', id: result.insertId });
  });
});

// ========== Fetch All Requests ==========
app.get('/api/requests', (req, res) => {
  const sql = 'SELECT * FROM requests ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching requests' });
    res.status(200).json(results);
  });
});

// ========== Open Requests for Providers ==========
app.get('/api/open-requests', (req, res) => {
  const sql = `SELECT * FROM requests WHERE status = 'pending' AND provider_id IS NULL ORDER BY created_at DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching open requests' });
    res.status(200).json(results);
  });
});

// ========== Assign Provider ==========
app.put('/api/assign-request/:id', (req, res) => {
  const requestId = req.params.id;
  const { provider_id } = req.body;

  const sql = `UPDATE requests SET provider_id = ?, status = 'accepted' WHERE id = ?`;
  db.query(sql, [provider_id, requestId], (err, result) => {
    if (err) return res.status(500).json({ message: 'Failed to assign provider' });
    res.status(200).json({ message: 'Request accepted by provider' });
  });
});

// ========== Update Provider Location ==========
app.put('/api/providers/:id/location', (req, res) => {
  const providerId = req.params.id;
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ message: 'Latitude and longitude required' });
  }

  const sql = `UPDATE service_providers SET latitude = ?, longitude = ? WHERE id = ?`;
  db.query(sql, [latitude, longitude, providerId], (err, result) => {
    if (err) return res.status(500).json({ message: 'Failed to update location' });
    res.status(200).json({ message: 'Provider location updated' });
  });
});

// ========== Get Provider Location ==========
app.get('/api/providers/:id/location', (req, res) => {
  const providerId = req.params.id;

  const sql = `SELECT latitude, longitude FROM service_providers WHERE id = ?`;
  db.query(sql, [providerId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching location' });
    res.status(200).json(results[0]);
  });
});

// ========== Start Server ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🟢 Server running on http://localhost:${PORT}`);
});

// Update provider location
app.put('/api/update-location/:provider_id', (req, res) => {
  const { provider_id } = req.params;
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ message: 'Missing location data' });
  }

  const sql = `
    UPDATE service_providers
    SET current_latitude = ?, current_longitude = ?
    WHERE id = ?
  `;

  db.query(sql, [latitude, longitude, provider_id], (err, result) => {
    if (err) {
      console.error('❌ Failed to update location:', err);
      return res.status(500).json({ message: 'Error updating location' });
    }

    res.status(200).json({ message: 'Location updated successfully' });
  });
});

// Get live provider location
app.get('/api/provider-location/:provider_id', (req, res) => {
  const { provider_id } = req.params;

  const sql = `
    SELECT current_latitude, current_longitude
    FROM service_providers
    WHERE id = ?
  `;

  db.query(sql, [provider_id], (err, results) => {
    if (err) {
      console.error('❌ Location fetch failed:', err);
      return res.status(500).json({ message: 'Failed to fetch location' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    res.status(200).json(results[0]);
  });
});

const bcrypt = require('bcrypt');

// … after your other imports and middleware…

// Signup new user
app.post('/api/signup', async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // 1) Hash the password
    const hashed = await bcrypt.hash(password, 10);

    // 2) Insert into users with hashed password
    const sql = `
      INSERT INTO users (name, email, password, phone, role)
      VALUES (?, ?, ?, ?, ?)
    `;
    await db.promise().query(sql, [name, email, hashed, phone || null, role || 'user']);
    res.status(201).json({ message: 'Signup successful' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Error signing up' });
  }
});

// Login existing user
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }

  try {
    // 1) Fetch the user by email
    const [rows] = await db.promise().query(
      'SELECT id, name, email, password, role FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];

    // 2) Compare supplied password against hash
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3) Remove password before sending back
    delete user.password;
    res.json({ user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Error logging in' });
  }
});
