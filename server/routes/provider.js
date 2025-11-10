const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Middleware to verify provider role
const verifyProvider = (req, res, next) => {
  if (req.user.role !== 'provider') {
    return res.status(403).json({ message: 'Access denied. Provider role required.' });
  }
  next();
};

// ================== GET PROVIDER PROFILE ==================
router.get('/profile', verifyToken, verifyProvider, (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.id;

  const query = `
    SELECT 
      sp.*,
      u.name, u.email, u.phone, u.address
    FROM service_providers sp
    JOIN users u ON sp.user_id = u.id
    WHERE sp.user_id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching provider profile:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!results.length) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const provider = results[0];
    
    // Parse service_types if it's a string
    if (typeof provider.service_types === 'string') {
      try {
        provider.service_types = JSON.parse(provider.service_types);
      } catch (e) {
        provider.service_types = [provider.service_types];
      }
    }

    res.json({
      status: 'OK',
      provider: provider
    });
  });
});

// ================== GET PROVIDER STATISTICS ==================
router.get('/stats/:providerId', verifyToken, verifyProvider, (req, res) => {
  const db = req.app.locals.db;
  const providerId = req.params.providerId;
  const userId = req.user.id;

  // Verify ownership
  db.query('SELECT user_id FROM service_providers WHERE id = ?', [providerId], (err, providers) => {
    if (err) {
      console.error('Error verifying provider:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!providers.length || providers[0].user_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get statistics
    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as totalCompleted,
        COALESCE(AVG(user_rating), 0) as rating,
        COALESCE(SUM(CASE WHEN DATE(completed_at) = CURDATE() AND status = 'completed' THEN final_cost ELSE 0 END), 0) as todayEarnings,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingRequests,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as activeRequests
      FROM service_requests
      WHERE provider_id = ?
    `;

    db.query(statsQuery, [providerId], (statsErr, stats) => {
      if (statsErr) {
        console.error('Error fetching stats:', statsErr);
        return res.status(500).json({ message: 'Error fetching statistics' });
      }

      res.json({
        status: 'OK',
        totalCompleted: stats[0].totalCompleted || 0,
        rating: parseFloat(stats[0].rating) || 0,
        todayEarnings: parseFloat(stats[0].todayEarnings) || 0,
        pendingRequests: stats[0].pendingRequests || 0,
        activeRequests: stats[0].activeRequests || 0
      });
    });
  });
});

// ================== GET PROVIDER DASHBOARD ==================
router.get('/dashboard', verifyToken, verifyProvider, (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.id;

  // Get provider ID first
  db.query('SELECT id FROM service_providers WHERE user_id = ?', [userId], (err, providers) => {
    if (err) {
      console.error('Error fetching provider:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!providers.length) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const providerId = providers[0].id;

    // Get dashboard data
    const dashboardQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_completed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as active_requests,
        COALESCE(AVG(user_rating), 0) as average_rating,
        COALESCE(SUM(CASE WHEN DATE(completed_at) = CURDATE() THEN final_cost ELSE 0 END), 0) as today_earnings,
        COALESCE(SUM(CASE WHEN MONTH(completed_at) = MONTH(CURDATE()) THEN final_cost ELSE 0 END), 0) as month_earnings
      FROM service_requests
      WHERE provider_id = ?
    `;

    db.query(dashboardQuery, [providerId], (dashErr, dashboard) => {
      if (dashErr) {
        console.error('Error fetching dashboard:', dashErr);
        return res.status(500).json({ message: 'Error fetching dashboard data' });
      }

      res.json({
        status: 'OK',
        provider_id: providerId,
        statistics: {
          totalCompleted: dashboard[0].total_completed || 0,
          pendingRequests: dashboard[0].pending_requests || 0,
          activeRequests: dashboard[0].active_requests || 0,
          rating: parseFloat(dashboard[0].average_rating) || 0,
          todayEarnings: parseFloat(dashboard[0].today_earnings) || 0,
          monthEarnings: parseFloat(dashboard[0].month_earnings) || 0
        }
      });
    });
  });
});

// ================== GET PENDING REQUESTS ==================
router.get('/requests/pending', verifyToken, verifyProvider, (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.id;

  // Get provider ID
  db.query('SELECT id FROM service_providers WHERE user_id = ?', [userId], (err, providers) => {
    if (err) {
      console.error('Error fetching provider:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!providers.length) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const providerId = providers[0].id;

    // Get pending requests
    const query = `
      SELECT 
        r.*,
        u.name as user_name,
        u.phone as user_phone,
        u.email as user_email
      FROM service_requests r
      JOIN users u ON r.user_id = u.id
      WHERE r.provider_id = ? AND r.status = 'pending'
      ORDER BY r.created_at DESC
    `;

    db.query(query, [providerId], (reqErr, requests) => {
      if (reqErr) {
        console.error('Error fetching pending requests:', reqErr);
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

// ================== GET REQUEST HISTORY ==================
router.get('/requests/history', verifyToken, verifyProvider, (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.id;
  const { status, limit = 50 } = req.query;

  // Get provider ID
  db.query('SELECT id FROM service_providers WHERE user_id = ?', [userId], (err, providers) => {
    if (err) {
      console.error('Error fetching provider:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!providers.length) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const providerId = providers[0].id;

    // Build query
    let query = `
      SELECT 
        r.*,
        u.name as user_name,
        u.phone as user_phone,
        u.email as user_email
      FROM service_requests r
      JOIN users u ON r.user_id = u.id
      WHERE r.provider_id = ?
    `;

    const params = [providerId];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    db.query(query, params, (histErr, requests) => {
      if (histErr) {
        console.error('Error fetching request history:', histErr);
        return res.status(500).json({ message: 'Error fetching request history' });
      }

      res.json({
        status: 'OK',
        count: requests.length,
        requests: requests
      });
    });
  });
});

// ================== ACCEPT/ASSIGN REQUEST ==================
router.put('/requests/:id/assign', verifyToken, verifyProvider, (req, res) => {
  const db = req.app.locals.db;
  const io = req.app.locals.io;
  const requestId = req.params.id;
  const userId = req.user.id;

  // Get provider ID
  db.query('SELECT id FROM service_providers WHERE user_id = ?', [userId], (err, providers) => {
    if (err) {
      console.error('Error fetching provider:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!providers.length) {
      return res.status(403).json({ message: 'Provider profile not found' });
    }

    const providerId = providers[0].id;

    // Check if request exists and is pending
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

      // Update request to accepted
      db.query(
        'UPDATE service_requests SET status = ?, assigned_at = NOW() WHERE id = ?',
        ['accepted', requestId],
        (updateErr) => {
          if (updateErr) {
            console.error('Error accepting request:', updateErr);
            return res.status(500).json({ message: 'Error accepting request' });
          }

          // Emit socket event to user
          if (io) {
            io.to(`user_${request.user_id}`).emit('request_accepted', {
              request_id: requestId,
              provider_id: providerId
            });
          }

          res.json({
            message: 'Request accepted successfully',
            request_id: requestId,
            status: 'accepted'
          });
        }
      );
    });
  });
});

// ================== UPDATE REQUEST STATUS ==================
router.put('/requests/:id/status', verifyToken, verifyProvider, (req, res) => {
  const db = req.app.locals.db;
  const io = req.app.locals.io;
  const requestId = req.params.id;
  const { status } = req.body;
  const userId = req.user.id;

  if (!['accepted', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  // Get provider ID
  db.query('SELECT id FROM service_providers WHERE user_id = ?', [userId], (err, providers) => {
    if (err) {
      console.error('Error fetching provider:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!providers.length) {
      return res.status(403).json({ message: 'Provider profile not found' });
    }

    const providerId = providers[0].id;

    // Verify request belongs to this provider
    db.query('SELECT * FROM service_requests WHERE id = ? AND provider_id = ?', [requestId, providerId], (reqErr, requests) => {
      if (reqErr) {
        console.error('Error fetching request:', reqErr);
        return res.status(500).json({ message: 'Database error' });
      }

      if (!requests.length) {
        return res.status(404).json({ message: 'Request not found' });
      }

      const request = requests[0];

      // Build update query based on status
      let updateQuery = 'UPDATE service_requests SET status = ?';
      const params = [status];

      if (status === 'accepted') {
        updateQuery += ', assigned_at = NOW()';
      } else if (status === 'completed') {
        updateQuery += ', completed_at = NOW()';
      }

      updateQuery += ' WHERE id = ?';
      params.push(requestId);

      db.query(updateQuery, params, (updateErr) => {
        if (updateErr) {
          console.error('Error updating request:', updateErr);
          return res.status(500).json({ message: 'Error updating request status' });
        }

        // Emit socket event
        if (io) {
          const eventName = status === 'completed' ? 'request_completed' : 'request_updated';
          io.to(`user_${request.user_id}`).emit(eventName, {
            request_id: requestId,
            status: status
          });
        }

        res.json({
          message: `Request ${status} successfully`,
          request_id: requestId,
          status: status
        });
      });
    });
  });
});

// ================== TOGGLE AVAILABILITY ==================
router.put('/:id/availability', verifyToken, verifyProvider, (req, res) => {
  const db = req.app.locals.db;
  const providerId = req.params.id;
  const { is_available } = req.body;
  const userId = req.user.id;

  // Verify ownership
  db.query('SELECT user_id FROM service_providers WHERE id = ?', [providerId], (err, providers) => {
    if (err) {
      console.error('Error fetching provider:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!providers.length) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    if (providers[0].user_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Update availability
    db.query(
      'UPDATE service_providers SET is_available = ?, updated_at = NOW() WHERE id = ?',
      [is_available ? 1 : 0, providerId],
      (updateErr) => {
        if (updateErr) {
          console.error('Error updating availability:', updateErr);
          return res.status(500).json({ message: 'Error updating availability' });
        }

        res.json({
          message: 'Availability updated successfully',
          provider_id: providerId,
          is_available: is_available
        });
      }
    );
  });
});

module.exports = router;