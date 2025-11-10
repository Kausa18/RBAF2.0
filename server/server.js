require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const http = require('http');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const authRoutes = require('./routes/auth');
const { generateToken, verifyToken } = require('./middleware/auth');
const initializeSocket = require('./socket');
const swaggerDocument = require('./swagger.json');
const providerRoutes = require('./routes/provider');
const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT || 100,
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/auth', authRoutes);
app.use('/api/provider', providerRoutes);

// ================== DATABASE ==================
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Z!mb@2003',
  database: process.env.DB_NAME || 'road_assistance_app'
});

db.connect((err) => {
  if (err) {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL');
});

// Make db and io available to routes
app.locals.db = db;
app.locals.io = io;

// ================== SIGNUP ==================
app.post('/api/signup', async (req, res) => {
  const {
    name, email, password, phone, role,
    businessName, serviceArea, serviceTypes, experience, licenseNumber,
    address, emergency_contact
  } = req.body;

  if (!name || !email || !password || !phone || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!['user', 'provider'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role. Must be "user" or "provider"' });
  }

  if (role === 'provider' && (!businessName || !serviceArea || !serviceTypes || !experience || !licenseNumber)) {
    return res.status(400).json({ message: 'Missing provider fields' });
  }

  try {
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, existingUsers) => {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      db.beginTransaction(err => {
        if (err) {
          console.error('Transaction error:', err);
          return res.status(500).json({ message: 'Transaction error' });
        }

        const userSql = 'INSERT INTO users (name, email, password, phone, address, emergency_contact, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())';
        const userValues = [name, email, hashedPassword, phone, address || null, emergency_contact || null, role];

        db.query(userSql, userValues, (userErr, userResult) => {
          if (userErr) {
            console.error('User insert error:', userErr);
            return db.rollback(() => {
              res.status(500).json({ message: 'Error creating user' });
            });
          }

          const userId = userResult.insertId;

          if (role === 'provider') {
            const providerSql = `
              INSERT INTO service_providers (
                user_id, business_name, service_area, service_types,
                experience_years, license_number, status, is_available, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, 'approved', 0, NOW())
            `;
            const providerValues = [
              userId, 
              businessName, 
              serviceArea, 
              JSON.stringify(serviceTypes), 
              experience, 
              licenseNumber
            ];

            db.query(providerSql, providerValues, (provErr) => {
              if (provErr) {
                console.error('Provider insert error:', provErr);
                return db.rollback(() => {
                  res.status(500).json({ message: 'Error creating provider' });
                });
              }

              db.commit(commitErr => {
                if (commitErr) {
                  console.error('Commit error:', commitErr);
                  return db.rollback(() => {
                    res.status(500).json({ message: 'Error completing signup' });
                  });
                }
                res.status(201).json({ 
                  message: 'Provider account created successfully', 
                  userId, 
                  role: 'provider', 
                  status: 'approved' 
                });
              });
            });
          } else {
            db.commit(commitErr => {
              if (commitErr) {
                console.error('Commit error:', commitErr);
                return db.rollback(() => {
                  res.status(500).json({ message: 'Error completing signup' });
                });
              }
              res.status(201).json({ 
                message: 'User account created successfully', 
                userId, 
                role: 'user' 
              });
            });
          }
        });
      });
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// ================== LOGIN ==================
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    db.query('SELECT * FROM users WHERE email = ?', [normalizedEmail], async (err, users) => {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (!users.length) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const user = users[0];
      
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const { password: _, ...userData } = user;
      const token = generateToken(userData);
      
      let responseData = { 
        message: 'Login successful', 
        user: userData, 
        token 
      };

      if (user.role === 'provider') {
        db.query('SELECT * FROM service_providers WHERE user_id = ?', [user.id], (provErr, providers) => {
          if (provErr) {
            console.error('Provider fetch error:', provErr);
            return res.status(500).json({ message: 'Error fetching provider data' });
          }
          
          if (!providers.length) {
            return res.status(404).json({ message: 'Provider profile not found' });
          }

          const provider = providers[0];
          
          let serviceTypes = [];
          const rawServiceTypes = provider.service_types;

          if (Array.isArray(rawServiceTypes)) {
            serviceTypes = rawServiceTypes;
          } else if (typeof rawServiceTypes === 'string') {
            const trimmed = rawServiceTypes.trim();
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
              try {
                serviceTypes = JSON.parse(trimmed);
              } catch (parseError) {
                console.error('JSON parse error:', parseError);
                serviceTypes = [trimmed];
              }
            } else if (trimmed) {
              serviceTypes = [trimmed];
            }
          } else if (rawServiceTypes != null) {
            serviceTypes = [rawServiceTypes];
          }

          responseData.provider = { 
            ...provider, 
            service_types: serviceTypes
          };
          res.json(responseData);
        });
      } else {
        res.json(responseData);
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ================== MATCH PROVIDERS ==================
const matchProvidersHandler = (req, res) => {
  const { latitude, longitude } = req.body;
  
  if (latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Missing latitude or longitude' });
  }

  const query = `
    SELECT id, user_id, business_name, service_types, latitude, longitude, coverage_radius
    FROM service_providers
    WHERE status = 'approved' AND is_available = TRUE
      AND latitude IS NOT NULL AND longitude IS NOT NULL
  `;

  db.query(query, (err, providers) => {
    if (err) {
      console.error('Match providers DB error:', err);
      return res.status(500).json({ error: 'Database query failed', details: err.message });
    }

    if (!providers || providers.length === 0) {
      return res.status(200).json({ 
        status: 'OK', 
        count: 0,
        providers: [] 
      });
    }

    const haversineDistance = (lat1, lon1, lat2, lon2) => {
      const toRad = deg => deg * Math.PI / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + 
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
                Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    try {
      const filteredProviders = providers
        .map(p => {
          const distance = haversineDistance(
            parseFloat(latitude), 
            parseFloat(longitude), 
            parseFloat(p.latitude), 
            parseFloat(p.longitude)
          );
          
          let services = [];
          const rawServiceTypes = p.service_types;

          if (Array.isArray(rawServiceTypes)) {
            services = rawServiceTypes;
          } else if (typeof rawServiceTypes === 'string') {
            const trimmed = rawServiceTypes.trim();
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
              try {
                services = JSON.parse(trimmed);
              } catch (e) {
                console.error('Error parsing service types for provider', p.id, ':', e);
                services = [trimmed];
              }
            } else if (trimmed) {
              services = [trimmed];
            }
          } else if (rawServiceTypes != null) {
            services = [rawServiceTypes];
          }
          
          return { 
            id: p.id,
            user_id: p.user_id,
            business_name: p.business_name,
            service_types: services,
            latitude: parseFloat(p.latitude),
            longitude: parseFloat(p.longitude),
            coverage_radius: p.coverage_radius || 50,
            distance_km: Math.round(distance * 100) / 100
          };
        })
        .filter(p => p.distance_km <= p.coverage_radius)
        .sort((a, b) => a.distance_km - b.distance_km);

      res.status(200).json({ 
        status: 'OK', 
        count: filteredProviders.length,
        providers: filteredProviders 
      });
    } catch (processingErr) {
      console.error('Error processing providers:', processingErr);
      res.status(500).json({ error: 'Error processing provider data' });
    }
  });
};

app.post('/api/match-providers', matchProvidersHandler);
app.post('/match-providers', matchProvidersHandler);

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;
    } catch (err) {
      console.log('Invalid token, proceeding without auth:', err.message);
    }
  }
  next();
};

// ================== CREATE HELP REQUEST ==================
app.post('/api/request-help', optionalAuth, (req, res) => {
  try {
    const { user_id, provider_id, latitude, longitude, issue_type, address, description } = req.body;
    
    if (!user_id || !provider_id || latitude == null || longitude == null || !issue_type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    if (req.user && req.user.id !== parseInt(user_id)) {
      return res.status(403).json({ message: 'Unauthorized to create request for another user' });
    }
    
    // FIXED: Use service_requests table
    const insertQuery = `
      INSERT INTO service_requests (
        user_id, 
        provider_id, 
        service_type, 
        latitude, 
        longitude, 
        address, 
        description, 
        status, 
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;
    
    const values = [
      user_id,
      provider_id,
      issue_type,
      latitude,
      longitude,
      address || 'Current Location',
      description || ''
    ];
    
    db.query(insertQuery, values, (err, result) => {
      if (err) {
        console.error('Error creating request:', err);
        return res.status(500).json({ message: 'Error creating request', error: err.message });
      }
      
      const requestId = result.insertId;
      
      // FIXED: Use service_requests table
      const fetchQuery = `
        SELECT 
          r.*,
          u.name as user_name,
          u.phone as user_phone,
          u.email as user_email,
          sp.business_name as provider_name,
          sp.user_id as provider_user_id
        FROM service_requests r
        JOIN users u ON r.user_id = u.id
        JOIN service_providers sp ON r.provider_id = sp.id
        WHERE r.id = ?
      `;
      
      db.query(fetchQuery, [requestId], (fetchErr, requests) => {
        if (fetchErr) {
          console.error('Error fetching created request:', fetchErr);
          return res.status(500).json({ message: 'Request created but error fetching details' });
        }
        
        const request = requests[0];
        
        try {
          if (io) {
            io.to(`provider_${request.provider_user_id}`).emit('new_request', {
              request_id: requestId,
              user_name: request.user_name,
              service_type: request.service_type,
              latitude: request.latitude,
              longitude: request.longitude,
              address: request.address,
              description: request.description
            });
          }
        } catch (socketErr) {
          console.error('Socket emission error:', socketErr);
        }
        
        res.status(201).json({
          message: 'Help request sent successfully',
          request_id: requestId,
          request: request
        });
      });
    });
  } catch (error) {
    console.error('Request help error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ================== GET USER REQUESTS ==================
app.get('/api/user-requests/:userId', verifyToken, (req, res) => {
  const userId = req.params.userId;
  
  if (req.user.id !== parseInt(userId)) {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  
  // FIXED: Use service_requests table
  const query = `
    SELECT 
      r.*,
      sp.business_name as provider_name,
      sp.user_id as provider_user_id,
      u.name as provider_contact_name,
      u.phone as provider_phone
    FROM service_requests r
    LEFT JOIN service_providers sp ON r.provider_id = sp.id
    LEFT JOIN users u ON sp.user_id = u.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `;
  
  db.query(query, [userId], (err, requests) => {
    if (err) {
      console.error('Error fetching user requests:', err);
      return res.status(500).json({ message: 'Error fetching requests' });
    }
    
    res.json({
      status: 'OK',
      count: requests.length,
      requests: requests
    });
  });
});

// ================== GET OPEN REQUESTS ==================
app.get('/api/open-requests', verifyToken, (req, res) => {
  const userId = req.user.id;
  
  db.query('SELECT id FROM service_providers WHERE user_id = ?', [userId], (err, providers) => {
    if (err) {
      console.error('Error fetching provider:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!providers.length) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    const providerId = providers[0].id;
    
    // FIXED: Use service_requests table
    const query = `
      SELECT 
        r.id,
        r.user_id,
        r.service_type,
        r.latitude,
        r.longitude,
        r.address,
        r.description,
        r.status,
        r.created_at,
        u.name as user_name,
        u.phone as user_phone
      FROM service_requests r
      JOIN users u ON r.user_id = u.id
      WHERE r.provider_id = ? AND r.status IN ('pending', 'accepted')
      ORDER BY r.created_at DESC
    `;
    
    db.query(query, [providerId], (reqErr, requests) => {
      if (reqErr) {
        console.error('Error fetching requests:', reqErr);
        return res.status(500).json({ message: 'Error fetching requests' });
      }
      
      res.json({ 
        status: 'OK',
        count: requests.length,
        requests: requests 
      });
    });
  });
});

// ================== UPDATE PROVIDER LOCATION ==================
app.put('/api/update-location/:id', verifyToken, async (req, res) => {
  const providerId = req.params.id;
  const { latitude, longitude, is_available } = req.body;
  
  if (latitude == null || longitude == null) {
    return res.status(400).json({ message: 'Latitude and longitude are required' });
  }
  
  db.query('SELECT user_id FROM service_providers WHERE id = ?', [providerId], (err, providers) => {
    if (err) {
      console.error('Error fetching provider:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!providers.length) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    if (providers[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to update this provider' });
    }
    
    const updates = ['latitude = ?', 'longitude = ?'];
    const values = [latitude, longitude];
    
    if (is_available !== undefined) {
      updates.push('is_available = ?');
      values.push(is_available ? 1 : 0);
    }
    
    values.push(providerId);
    
    const updateQuery = `UPDATE service_providers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
    
    db.query(updateQuery, values, (updateErr, result) => {
      if (updateErr) {
        console.error('Error updating location:', updateErr);
        console.error('Update query values:', values);
        return res.status(500).json({ message: 'Error updating location', error: updateErr.message });
      }
      
      res.json({ 
        message: 'Location updated successfully',
        provider_id: providerId,
        latitude,
        longitude,
        is_available: is_available !== undefined ? is_available : null
      });
    });
  });
});

// ================== ACCEPT REQUEST ==================
app.put('/api/requests/:id/accept', verifyToken, (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;
  
  db.query('SELECT id FROM service_providers WHERE user_id = ?', [userId], (err, providers) => {
    if (err) {
      console.error('Error fetching provider:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!providers.length) {
      return res.status(403).json({ message: 'Only providers can accept requests' });
    }
    
    const providerId = providers[0].id;
    
    // FIXED: Use service_requests table
    db.query('SELECT * FROM service_requests WHERE id = ? AND provider_id = ?', [requestId, providerId], (reqErr, requests) => {
      if (reqErr) {
        console.error('Error fetching request:', reqErr);
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (!requests.length) {
        return res.status(404).json({ message: 'Request not found or not assigned to you' });
      }
      
      const request = requests[0];
      
      if (request.status !== 'pending') {
        return res.status(400).json({ message: `Request is already ${request.status}` });
      }
      
      // FIXED: Use service_requests table
      db.query('UPDATE service_requests SET status = ?, assigned_at = NOW() WHERE id = ?', ['accepted', requestId], (updateErr) => {
        if (updateErr) {
          console.error('Error updating request:', updateErr);
          return res.status(500).json({ message: 'Error accepting request' });
        }
        
        if (io) {
          io.to(`user_${request.user_id}`).emit('request_accepted', {
            request_id: requestId,
            provider_id: providerId
          });
        }
        
        res.json({ 
          message: 'Request accepted successfully',
          request_id: requestId
        });
      });
    });
  });
});

// ================== COMPLETE REQUEST ==================
app.put('/api/requests/:id/complete', verifyToken, (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;
  
  db.query('SELECT id FROM service_providers WHERE user_id = ?', [userId], (err, providers) => {
    if (err) {
      console.error('Error fetching provider:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!providers.length) {
      return res.status(403).json({ message: 'Only providers can complete requests' });
    }
    
    const providerId = providers[0].id;
    
    // FIXED: Use service_requests table
    db.query('SELECT * FROM service_requests WHERE id = ? AND provider_id = ?', [requestId, providerId], (reqErr, requests) => {
      if (reqErr) {
        console.error('Error fetching request:', reqErr);
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (!requests.length) {
        return res.status(404).json({ message: 'Request not found or not assigned to you' });
      }
      
      const request = requests[0];
      
      if (request.status === 'completed') {
        return res.status(400).json({ message: 'Request is already completed' });
      }
      
      // FIXED: Use service_requests table
      db.query('UPDATE service_requests SET status = ?, completed_at = NOW() WHERE id = ?', ['completed', requestId], (updateErr) => {
        if (updateErr) {
          console.error('Error updating request:', updateErr);
          return res.status(500).json({ message: 'Error completing request' });
        }
        
        if (io) {
          io.to(`user_${request.user_id}`).emit('request_completed', {
            request_id: requestId
          });
        }
        
        res.json({ 
          message: 'Request completed successfully',
          request_id: requestId
        });
      });
    });
  });
});

// ================== DECLINE REQUEST ==================
app.put('/api/requests/:id/decline', verifyToken, (req, res) => {
  const requestId = req.params.id;
  const { decline_reason } = req.body;
  const userId = req.user.id;

  if (req.user.role !== 'provider') {
    return res.status(403).json({ message: 'Only providers can decline requests' });
  }

  db.query('SELECT id FROM service_providers WHERE user_id = ?', [userId], (err, providers) => {
    if (err) {
      console.error('Error fetching provider:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!providers.length) {
      return res.status(403).json({ message: 'Provider profile not found' });
    }

    const providerId = providers[0].id;

    // FIXED: Use service_requests table consistently
    db.query('SELECT * FROM service_requests WHERE id = ? AND provider_id = ?', [requestId, providerId], (reqErr, requests) => {
      if (reqErr) {
        console.error('Error fetching request:', reqErr);
        return res.status(500).json({ message: 'Database error' });
      }

      if (!requests.length) {
        return res.status(404).json({ message: 'Request not found or not assigned to you' });
      }

      const request = requests[0];

      if (request.status !== 'pending') {
        return res.status(400).json({ message: `Cannot decline request with status: ${request.status}` });
      }

      // FIXED: Use service_requests table
      const updateQuery = `
        UPDATE service_requests 
        SET status = 'declined', 
            decline_reason = ?,
            declined_at = NOW()
        WHERE id = ?
      `;

      db.query(updateQuery, [decline_reason || 'No reason provided', requestId], (updateErr) => {
        if (updateErr) {
          console.error('Error declining request:', updateErr);
          return res.status(500).json({ message: 'Error declining request' });
        }

        if (io) {
          io.to(`user_${request.user_id}`).emit('request_declined', {
            request_id: requestId,
            provider_id: providerId,
            decline_reason: decline_reason || 'No reason provided'
          });
        }

        res.json({
          message: 'Request declined successfully',
          request_id: requestId
        });
      });
    });
  });
});

// ================== CANCEL REQUEST ==================
app.put('/api/requests/:id/cancel', verifyToken, (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;
  
  // FIXED: Use service_requests table
  db.query('SELECT * FROM service_requests WHERE id = ?', [requestId], (err, requests) => {
    if (err) {
      console.error('Error fetching request:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!requests.length) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    const request = requests[0];
    
    if (request.user_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized to cancel this request' });
    }
    
    if (request.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed request' });
    }
    
    if (request.status === 'cancelled') {
      return res.status(400).json({ message: 'Request is already cancelled' });
    }
    
    // FIXED: Use service_requests table
    db.query('UPDATE service_requests SET status = ?, cancelled_at = NOW() WHERE id = ?', ['cancelled', requestId], (updateErr) => {
      if (updateErr) {
        console.error('Error updating request:', updateErr);
        return res.status(500).json({ message: 'Error cancelling request' });
      }
      
      if (io && request.provider_id) {
        db.query('SELECT user_id FROM service_providers WHERE id = ?', [request.provider_id], (provErr, providers) => {
          if (!provErr && providers.length) {
            io.to(`provider_${providers[0].user_id}`).emit('request_cancelled', {
              request_id: requestId
            });
          }
        });
      }
      
      res.json({ 
        message: 'Request cancelled successfully',
        request_id: requestId
      });
    });
  });
});

// ================== GET REQUEST DETAILS ==================
app.get('/api/requests/:id', verifyToken, (req, res) => {
  const requestId = req.params.id;
  
  // FIXED: Use service_requests table
  const query = `
    SELECT 
      r.*,
      u.name as user_name,
      u.phone as user_phone,
      u.email as user_email,
      sp.business_name as provider_name,
      sp.user_id as provider_user_id,
      pu.phone as provider_phone
    FROM service_requests r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN service_providers sp ON r.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE r.id = ?
  `;
  
  db.query(query, [requestId], (err, requests) => {
    if (err) {
      console.error('Error fetching request:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!requests.length) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    const request = requests[0];
    
    if (request.user_id !== req.user.id && request.provider_user_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to view this request' });
    }
    
    res.json({ 
      status: 'OK',
      request: request
    });
  });
});

// ================== HEALTH CHECK ==================
app.get('/api/health', (req, res) => {
  db.ping((err) => {
    const dbStatus = err ? 'disconnected' : 'connected';
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: dbStatus
    });
  });
});

// ================== ERROR HANDLING ==================
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// ================== SERVER ==================
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  db.end(err => {
    if (err) console.error('DB close error:', err);
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down...');
  db.end(err => {
    if (err) console.error('DB close error:', err);
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
});

module.exports = { app, server, io };