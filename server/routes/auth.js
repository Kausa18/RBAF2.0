// server/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { providers: mockProviders } = require('../mock/mockProviders');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const USE_MOCK = process.env.USE_MOCK === 'true';

// If you use a DB helper, require it here; keep it commented if not using
// const { getUserByEmailFromDB } = require('../lib/userDb');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    if (USE_MOCK) {
      const user = mockProviders.find(p => p.email === String(email).toLowerCase());
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });

      const ok = bcrypt.compareSync(password, user.passwordHash);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

      const payload = { id: user.id, email: user.email, name: user.name, role: user.role };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
      return res.json({ token, user: payload });
    }

    // --- DB path (example placeholder) ---
    // const dbUser = await getUserByEmailFromDB(email);
    // if (!dbUser) return res.status(401).json({ message: 'Invalid credentials' });
    // const ok = await bcrypt.compare(password, dbUser.passwordHash);
    // if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    // const payload = { id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role };
    // const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    // return res.json({ token, user: payload });

    return res.status(500).json({ message: 'DB login not configured (this server is in non-mock mode)' });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
