require('dotenv').config();
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const http = require('http');
const swaggerUi = require('swagger-ui-express');
const rateLimit = require('express-rate-limit');
const { validateSignup, validateLogin, validateRequest, validate } = require('./middleware/validation');
const { generateToken, verifyToken } = require('./middleware/auth');
const initializeSocket = require('./socket');
const swaggerDocument = require('./swagger.json');

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

// Rate limiting
const limiter = rateLimit({
    windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// ========== SECURE AUTHENTICATION ROUTES ==========

// User Signup (with bcrypt hashing)
app.post('/api/signup', validateSignup, validate, async (req, res) => {
  const { name, email, password, phone, address, emergency_contact } = req.body;
  
  try {
    // Check if user already exists
    const checkSql = 'SELECT * FROM users WHERE email = ?';
    db.query(checkSql, [email], async (err, results) => {
      if (err) {
        console.error('Error checking user existence:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (results.length > 0) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert new user
      const insertSql = 'INSERT INTO users (name, email, password, phone, address, emergency_contact) VALUES (?, ?, ?, ?, ?, ?)';
      db.query(insertSql, [name, email, hashedPassword, phone, address, emergency_contact], (err, result) => {
        if (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ message: 'Error creating user account' });
        }
        
        res.status(201).json({ 
          message: 'User created successfully',
          userId: result.insertId
        });
      });
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// User Login (with bcrypt verification and JWT)
app.post('/api/login', validateLogin, validate, async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
      if (err) {
        console.error('Error during login:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      const user = results[0];
      
      // Compare password with hash
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Return user data (excluding password) with JWT token
      const { password: _, ...userData } = user;
      const token = generateToken(userData);
      res.json({ 
        message: 'Login successful',
        user: userData,
        token
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ========== PROVIDER AUTHENTICATION ==========

// Provider Signup
app.post('/api/provider/signup', async (req, res) => {
  const { name, email, password, phone, services, address, latitude, longitude } = req.body;
  
  try {
    // Check if provider already exists
    const checkSql = 'SELECT * FROM service_providers WHERE email = ?';
    db.query(checkSql, [email], async (err, results) => {
      if (err) {
        console.error('Error checking provider existence:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (results.length > 0) {
        return res.status(400).json({ message: 'Provider already exists with this email' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert new provider
      const insertSql = 'INSERT INTO service_providers (name, email, password, phone, services, address, latitude, longitude, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)';
      db.query(insertSql, [name, email, hashedPassword, phone, JSON.stringify(services), address, latitude, longitude], (err, result) => {
        if (err) {
          console.error('Error creating provider:', err);
          return res.status(500).json({ message: 'Error creating provider account' });
        }
        
        res.status(201).json({ 
          message: 'Provider created successfully',
          providerId: result.insertId
        });
      });
    });
  } catch (error) {
    console.error('Provider signup error:', error);
    res.status(500).json({ message: 'Server error during provider signup' });
  }
});

// Provider Login
app.post('/api/provider/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const sql = 'SELECT * FROM service_providers WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
      if (err) {
        console.error('Error during provider login:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      const provider = results[0];
      
      // Compare password with hash
      const isMatch = await bcrypt.compare(password, provider.password);
      
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Return provider data (excluding password)
      const { password: _, ...providerData } = provider;
      res.json({ 
        message: 'Login successful',
        provider: providerData
      });
    });
  } catch (error) {
    console.error('Provider login error:', error);
    res.status(500).json({ message: 'Server error during provider login' });
  }
});

// ========== REQUEST MANAGEMENT ==========

// Create Help Request
app.post('/api/request-help', verifyToken, validateRequest, validate, (req, res) => {
  const { user_id, service_type, description, urgency_level, latitude, longitude, address } = req.body;
  
  if (!user_id || !service_type || !latitude || !longitude) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  const sql = `INSERT INTO requests (user_id, service_type, description, urgency_level, 
               latitude, longitude, address, status, created_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, 'open', NOW())`;
  
  db.query(sql, [user_id, service_type, description, urgency_level, latitude, longitude, address], 
    (err, result) => {
      if (err) {
        console.error('Error creating request:', err);
        return res.status(500).json({ message: 'Error creating request' });
      }
      
      res.status(201).json({ 
        message: 'Request created successfully',
        requestId: result.insertId
      });
    }
  );
});

// Get Open Requests for Providers
app.get('/api/open-requests', (req, res) => {
  const sql = `
    SELECT r.*, u.name as user_name, u.phone as user_phone, u.emergency_contact
    FROM requests r
    JOIN users u ON r.user_id = u.id
    WHERE r.status = 'open'
    ORDER BY r.urgency_level DESC, r.created_at ASC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching open requests:', err);
      return res.status(500).json({ message: 'Error fetching requests' });
    }
    res.json(results);
  });
});

// Assign Request to Provider
app.put('/api/assign-request/:requestId', (req, res) => {
  const requestId = req.params.requestId;
  const { provider_id } = req.body;
  
  if (!provider_id) {
    return res.status(400).json({ message: 'Provider ID is required' });
  }
  
  const sql = 'UPDATE requests SET provider_id = ?, status = "assigned", assigned_at = NOW() WHERE id = ?';
  
  db.query(sql, [provider_id, requestId], (err, result) => {
    if (err) {
      console.error('Error assigning request:', err);
      return res.status(500).json({ message: 'Error assigning request' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    res.json({ message: 'Request assigned successfully' });
  });
});

// ========== USER REQUEST HISTORY (MISSING ENDPOINT FIXED) ==========
app.get('/api/user/:userId/requests', (req, res) => {
  const userId = req.params.userId;
  
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }
  
  const sql = `
    SELECT r.*, sp.name as provider_name, sp.phone as provider_phone
    FROM requests r
    LEFT JOIN service_providers sp ON r.provider_id = sp.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `;
  
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user requests:', err);
      return res.status(500).json({ message: 'Error fetching request history' });
    }
    res.json(results);
  });
});

// ========== PROVIDER LOCATION MANAGEMENT (STANDARDIZED) ==========

// Update Provider Location (Single endpoint with standardized columns)
app.put('/api/update-location/:provider_id', (req, res) => {
  const providerId = req.params.provider_id;
  const { latitude, longitude } = req.body;
  
  if (!latitude || !longitude) {
    return res.status(400).json({ message: 'Latitude and longitude are required' });
  }
  
  // Using standardized latitude, longitude columns
  const sql = 'UPDATE service_providers SET latitude = ?, longitude = ?, last_location_update = NOW() WHERE id = ?';
  
  db.query(sql, [latitude, longitude, providerId], (err, result) => {
    if (err) {
      console.error('Error updating provider location:', err);
      return res.status(500).json({ message: 'Error updating location' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    res.json({ message: 'Location updated successfully' });
  });
});

// Get Provider Requests
app.get('/api/provider/:providerId/requests', (req, res) => {
  const providerId = req.params.providerId;
  
  const sql = `
    SELECT r.*, u.name as user_name, u.phone as user_phone, u.address as user_address
    FROM requests r
    JOIN users u ON r.user_id = u.id
    WHERE r.provider_id = ?
    ORDER BY r.created_at DESC
  `;
  
  db.query(sql, [providerId], (err, results) => {
    if (err) {
      console.error('Error fetching provider requests:', err);
      return res.status(500).json({ message: 'Error fetching requests' });
    }
    res.json(results);
  });
});

// Get Provider Statistics
app.get('/api/provider/:providerId/statistics', (req, res) => {
  const providerId = req.params.providerId;
  
  const sql = `
    SELECT 
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as totalCompleted,
      COALESCE(AVG(rating), 0) as rating,
      COALESCE(SUM(CASE 
        WHEN status = 'completed' 
        AND DATE(completed_at) = CURDATE() 
        THEN service_fee 
        ELSE 0 
      END), 0) as todayEarnings
    FROM requests
    WHERE provider_id = ?
  `;
  
  db.query(sql, [providerId], (err, results) => {
    if (err) {
      console.error('Error fetching provider statistics:', err);
      return res.status(500).json({ message: 'Error fetching statistics' });
    }
    res.json(results[0]);
  });
});

// Update Provider Availability
app.put('/api/provider/:providerId/availability', (req, res) => {
  const providerId = req.params.providerId;
  const { is_available } = req.body;
  
  const sql = 'UPDATE service_providers SET is_available = ? WHERE id = ?';
  
  db.query(sql, [is_available, providerId], (err, result) => {
    if (err) {
      console.error('Error updating provider availability:', err);
      return res.status(500).json({ message: 'Error updating availability' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    // Notify connected clients about availability change
    io.emit(`provider-status-${providerId}`, { is_available });
    
    res.json({ message: 'Availability updated successfully' });
  });
});

// Update Request Status
app.put('/api/request/:requestId/status', (req, res) => {
  const requestId = req.params.requestId;
  const { status } = req.body;
  
  const validStatuses = ['open', 'assigned', 'in_progress', 'completed', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }
  
  const sql = 'UPDATE requests SET status = ?, updated_at = NOW() WHERE id = ?';
  
  db.query(sql, [status, requestId], (err, result) => {
    if (err) {
      console.error('Error updating request status:', err);
      return res.status(500).json({ message: 'Error updating request status' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    res.json({ message: 'Request status updated successfully' });
  });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ========== SERVER STARTUP ==========
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
});

// Export for testing
module.exports = { app, server, io };