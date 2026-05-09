'use strict';

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const db = require('./db');

// Session store - uses auth_sessions table (separate from CCC PTY sessions table)
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000,
  createDatabaseTable: true,
  schema: {
    tableName: 'auth_sessions'
  }
});

// Session middleware - mounted globally in server.js
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 86400000
  }
});

// requireAuth - protects browser UI routes (/api/*)
// Returns 401 JSON for unauthenticated requests.
// The frontend handles the redirect to /login.
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
}

// requireApiToken - protects PatchPilot API routes (/api/v1/*)
// Checks Authorization: Bearer <token> header against CCC_API_TOKEN env var.
function requireApiToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Bearer token required' });
  }
  const token = authHeader.slice(7);
  if (!process.env.CCC_API_TOKEN || token !== process.env.CCC_API_TOKEN) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid token' });
  }
  return next();
}

// requireAdmin - protects admin-only API routes (e.g. user management).
// Looks up the role for req.session.userId; 403 unless role === 'admin'.
// Mount this AFTER requireAuth (the /api guard) so unauthenticated requests
// still get 401 from requireAuth before this runs.
async function requireAdmin(req, res, next) {
  try {
    const row = await db.queryOne(
      'SELECT role FROM users WHERE id = ?',
      [req.session && req.session.userId]
    );
    if (!row || row.role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin access required' });
    }
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
}

module.exports = { sessionMiddleware, requireAuth, requireApiToken, requireAdmin };
