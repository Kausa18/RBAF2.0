// server/mocks/mockProviders.js
const bcrypt = require('bcryptjs');

const plainProviders = [
  {
    id: 'prov-1',
    name: 'Alpha Tow',
    email: 'alpha@example.com',
    password: 'password123',
    role: 'provider'
  },
  {
    id: 'prov-2',
    name: 'Beta Rescue',
    email: 'beta@example.com',
    password: 'letmein456',
    role: 'provider'
  },
  {
    id: 'prov-3',
    name: 'Gamma Services',
    email: 'gamma@example.com',
    password: 'secret789',
    role: 'provider'
  }
];

const SALT_ROUNDS = 10;
const providers = plainProviders.map(p => ({
  id: p.id,
  name: p.name,
  email: p.email.toLowerCase(),
  passwordHash: bcrypt.hashSync(p.password, SALT_ROUNDS),
  role: p.role
}));

module.exports = { providers, plainProviders };
