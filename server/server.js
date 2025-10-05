require('dotenv').config();
const express = require('express');
const mysql = require('mysql2'); // Using callback version for compatibility
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
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes default
    max: process.env.RATE_LIMIT || 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Middleware
app.use(cors());
app.use(express.json());

// Database connection with promise support
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Z!mb@2003',
  database: process.env.DB_NAME || 'road_assistance_app'
});

// Test database connection
const testConnection = () => {
  db.query('SELECT 1', (err, results) => {
    if (err) {
      console.error('❌ Error connecting to MySQL:', err);
      process.exit(1);
    } else {
      console.log('✅ Connected to MySQL database');
    }
  });
};

testConnection();

// ========== UNIFIED SIGNUP ENDPOINT ==========

// Unified Signup (handles both users and providers)
app.post('/api/signup', async (req, res) => {
  const { 
    name, 
    email, 
    password, 
    phone, 
    role,
    // Provider-specific fields
    businessName,
    serviceArea,
    serviceTypes,
    experience,
    licenseNumber,
    // Optional user fields
    address,
    emergency_contact
  } = req.body;
  
  // Basic validation
  if (!name || !email || !password || !phone || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Provider-specific validation
  if (role === 'provider') {
    if (!businessName || !serviceArea || !serviceTypes || !experience || !licenseNumber) {
      return res.status(400).json({ 
        message: 'Missing required provider fields: businessName, serviceArea, serviceTypes, experience, licenseNumber' 
      });
    }

    if (!Array.isArray(serviceTypes) || serviceTypes.length === 0) {
      return res.status(400).json({ message: 'At least one service type must be selected' });
    }
  }
  
  try {
    // Check if user already exists
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, existingUsers) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error during signup' });
      }
      
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Start transaction
      db.beginTransaction((transErr) => {
        if (transErr) {
          console.error('Transaction error:', transErr);
          return res.status(500).json({ message: 'Server error during signup' });
        }
        
        // Insert user record
        const userInsertSql = `
          INSERT INTO users (name, email, password, phone, address, emergency_contact, role, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        db.query(userInsertSql, [
          name, 
          email, 
          hashedPassword, 
          phone, 
          address || null, 
          emergency_contact || null,
          role
        ], (userErr, userResult) => {
          if (userErr) {
            return db.rollback(() => {
              console.error('Error creating user:', userErr);
              res.status(500).json({ message: 'Error creating account' });
            });
          }
          
          const userId = userResult.insertId;
          
          // If provider, create provider record
          if (role === 'provider') {
            const providerInsertSql = `
              INSERT INTO service_providers (
                user_id, 
                business_name, 
                service_area, 
                service_types, 
                experience_years, 
                license_number, 
                status, 
                is_available, 
                created_at
              ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, NOW())
            `;
            
            // Convert serviceTypes array to JSON string
            const serviceTypesJson = JSON.stringify(serviceTypes);
            
            db.query(providerInsertSql, [
              userId,
              businessName,
              serviceArea,
              serviceTypesJson,
              parseInt(experience),
              licenseNumber
            ], (providerErr) => {
              if (providerErr) {
                return db.rollback(() => {
                  console.error('Error creating provider:', providerErr);
                  res.status(500).json({ message: 'Error creating provider account' });
                });
              }
              
              // Commit transaction
              db.commit((commitErr) => {
                if (commitErr) {
                  return db.rollback(() => {
                    console.error('Commit error:', commitErr);
                    res.status(500).json({ message: 'Error completing signup' });
                  });
                }
                
                res.status(201).json({ 
                  message: 'Provider account created successfully and is pending approval',
                  userId: userId,
                  role: 'provider',
                  status: 'pending'
                });
              });
            });
          } else {
            // Regular user signup
            db.commit((commitErr) => {
              if (commitErr) {
                return db.rollback(() => {
                  console.error('Commit error:', commitErr);
                  res.status(500).json({ message: 'Error completing signup' });
                });
              }
              
              res.status(201).json({ 
                message: 'User account created successfully',
                userId: userId,
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

// ========== UNIFIED LOGIN ENDPOINT ==========

// Unified Login (handles both users and providers)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  try {
    // Get user from database
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, users) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Server error during login' });
      }
      
      if (users.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      const user = users[0];
      
      // Compare password with hash
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Prepare response data
      const { password: _, ...userData } = user;
      let responseData = {
        message: 'Login successful',
        user: userData,
        token: generateToken(userData)
      };
      
      // If provider, get provider data
      if (user.role === 'provider') {
        db.query('SELECT * FROM service_providers WHERE user_id = ?', [user.id], (providerErr, providers) => {
          if (providerErr) {
            console.error('Provider query error:', providerErr);
            return res.status(500).json({ message: 'Server error during login' });
          }
          
          if (providers.length === 0) {
            return res.status(404).json({ message: 'Provider profile not found' });
          }
          
          const provider = providers[0];
          
          // Check if provider is approved
          if (provider.status === 'pending') {
            return res.status(403).json({ 
              message: 'Your provider account is still under review. Please wait for approval.',
              status: 'pending'
            });
          }
          
          if (provider.status === 'rejected') {
            return res.status(403).json({ 
              message: 'Your provider account has been rejected. Please contact support.',
              status: 'rejected'
            });
          }
          
          // Parse service_types JSON
          let serviceTypes = [];
          try {
            serviceTypes = JSON.parse(provider.service_types || '[]');
          } catch (e) {
            console.warn('Error parsing service_types for provider:', provider.id);
          }
          
          responseData.provider = {
            ...provider,
            service_types: serviceTypes
          };
          
          res.json(responseData);
        });
      } else {
        // Regular user login
        res.json(responseData);
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ========== PROVIDER APPROVAL ENDPOINT (ADMIN USE) ==========

// Approve/Reject Provider
app.put('/api/admin/provider/:providerId/status', async (req, res) => {
  const { providerId } = req.params;
  const { status, notes } = req.body; // status: 'approved', 'rejected', 'pending'
  
  const validStatuses = ['approved', 'rejected', 'pending'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status. Must be: approved, rejected, or pending' });
  }
  
  try {
    db.query(
      'UPDATE service_providers SET status = ?, approval_notes = ?, updated_at = NOW() WHERE id = ?',
      [status, notes || null, providerId],
      (err, result) => {
        if (err) {
          console.error('Error updating provider status:', err);
          return res.status(500).json({ message: 'Error updating provider status' });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Provider not found' });
        }
        
        // Get provider email for notification
        db.query(`
          SELECT u.email, u.name, sp.business_name 
          FROM service_providers sp 
          JOIN users u ON sp.user_id = u.id 
          WHERE sp.id = ?
        `, [providerId], (emailErr, providerData) => {
          if (!emailErr && providerData.length > 0) {
            // Here you could send email notification
            console.log(`Provider ${providerData[0].name} (${providerData[0].email}) status updated to: ${status}`);
          }
          
          res.json({ 
            message: `Provider ${status} successfully`,
            providerId: providerId,
            status: status
          });
        });
      }
    );
  } catch (error) {
    console.error('Error updating provider status:', error);
    res.status(500).json({ message: 'Error updating provider status' });
  }
});

// Get All Providers (Admin endpoint)
app.get('/api/admin/providers', async (req, res) => {
  try {
    const [providers] = await db.execute(`
      SELECT 
        sp.*,
        u.name,
        u.email,
        u.phone
      FROM service_providers sp
      JOIN users u ON sp.user_id = u.id
      ORDER BY sp.created_at DESC
    `);
    
    // Parse service_types for each provider
    const providersWithParsedServices = providers.map(provider => ({
      ...provider,
      service_types: (() => {
        try {
          return JSON.parse(provider.service_types || '[]');
        } catch (e) {
          return [];
        }
      })()
    }));
    
    res.json(providersWithParsedServices);
    
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ message: 'Error fetching providers' });
  }
});

// ========== REQUEST MANAGEMENT ==========

// Create Help Request
app.post('/api/request-help', verifyToken, async (req, res) => {
  const { user_id, service_type, description, urgency_level, latitude, longitude, address } = req.body;
  
  if (!user_id || !service_type || !latitude || !longitude) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  try {
    const [result] = await db.execute(`
      INSERT INTO requests (user_id, service_type, description, urgency_level, 
                           latitude, longitude, address, status, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'open', NOW())
    `, [user_id, service_type, description, urgency_level, latitude, longitude, address]);
    
    res.status(201).json({ 
      message: 'Request created successfully',
      requestId: result.insertId
    });
    
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ message: 'Error creating request' });
  }
});

// Get Open Requests for Providers
app.get('/api/open-requests', async (req, res) => {
  try {
    const [results] = await db.execute(`
      SELECT r.*, u.name as user_name, u.phone as user_phone, u.emergency_contact
      FROM requests r
      JOIN users u ON r.user_id = u.id
      WHERE r.status = 'open'
      ORDER BY r.urgency_level DESC, r.created_at ASC
    `);
    
    res.json(results);
    
  } catch (error) {
    console.error('Error fetching open requests:', error);
    res.status(500).json({ message: 'Error fetching requests' });
  }
});

// Get User Request History
app.get('/api/user/:userId/requests', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const [results] = await db.execute(`
      SELECT r.*, sp.business_name as provider_name, u2.phone as provider_phone
      FROM requests r
      LEFT JOIN service_providers sp ON r.provider_id = sp.id
      LEFT JOIN users u2 ON sp.user_id = u2.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `, [userId]);
    
    res.json(results);
    
  } catch (error) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ message: 'Error fetching request history' });
  }
});

// Get Provider Requests
app.get('/api/provider/:providerId/requests', async (req, res) => {
  const { providerId } = req.params;
  
  try {
    const [results] = await db.execute(`
      SELECT r.*, u.name as user_name, u.phone as user_phone, u.address as user_address
      FROM requests r
      JOIN users u ON r.user_id = u.id
      WHERE r.provider_id = ?
      ORDER BY r.created_at DESC
    `, [providerId]);
    
    res.json(results);
    
  } catch (error) {
    console.error('Error fetching provider requests:', error);
    res.status(500).json({ message: 'Error fetching requests' });
  }
});

// Update Request Status
app.put('/api/request/:requestId/status', async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['open', 'assigned', 'in_progress', 'completed', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }
  
  try {
    const [result] = await db.execute(
      'UPDATE requests SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, requestId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    res.json({ message: 'Request status updated successfully' });
    
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ message: 'Error updating request status' });
  }
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ========== SERVER STARTUP ==========
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health check available at http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  db.end((err) => {
    if (err) {
      console.error('Error closing database connection:', err);
    } else {
      console.log('Database connection closed');
    }
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

// Export for testing
module.exports = { app, server, io };