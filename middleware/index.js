import jwt from 'jsonwebtoken';
import { db } from '../utils/db.js';
import { JWT_SECRET_KEY } from '../utils/dotenv.js';

/**
 * Checks for a Bearer token in Authorization header,
 * verifies its signature & expiration, then ensures
 * it exists (and hasn’t expired) in user_tokens.
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // 1. Grab Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        Error: true,
        Code: 401,
        Status: 0,
        Message: 'Authorization header missing or malformed',
        Payload: {},
      });
    }
    const token = authHeader.split(' ')[1];

    // 2. Verify JWT signature & exp
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET_KEY);
    } catch (err) {
      const msg = err.name === 'TokenExpiredError' ? 'JWT expired' : 'Invalid JWT token';
      return res.status(401).json({
        Error: true,
        Code: 401,
        Status: 0,
        Message: msg,
        Payload: {},
      });
    }

    // 3. Look up token in DB
    const [rows] = await db.query('SELECT id, user_id, token, expires_at FROM user_tokens WHERE token = ?', [token]);

    if (rows.length === 0) {
      return res.status(401).json({
        Error: true,
        Code: 401,
        Status: 0,
        Message: 'Token not found (user might be logged out)',
        Payload: {},
      });
    }

    const tokenRecord = rows[0];

    // 4. Check DB expiration
    const now = new Date();
    if (tokenRecord.expires_at && now > new Date(tokenRecord.expires_at)) {
      return res.status(401).json({
        Error: true,
        Code: 401,
        Status: 0,
        Message: 'Token expired in database',
        Payload: {},
      });
    }

    // 5. All good → attach to req and proceed
    req.user = payload;
    req.tokenRecord = tokenRecord;
    next();
  } catch (error) {
    // Unexpected error
    console.error('[auth] Error validating token:', error);
    res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: 'Internal server error',
      Payload: {},
    });
  }
};

/**
 * After authenticateToken has run, this middleware
 * verifies that the authenticated user has is_admin = '1'.
 */
export const authorizeAdmin = async (req, res, next) => {
  try {
    const userId = req.tokenRecord.user_id;

    // Fetch the is_admin flag from users table
    const [rows] = await db.query('SELECT is_admin FROM users WHERE id = ?', [userId]);

    if (rows.length === 0) {
      // Shouldn't happen if authenticateToken passed, but just in case
      return res.status(404).json({
        Error: true,
        Code: 404,
        Status: 0,
        Message: 'User not found',
        Payload: {},
      });
    }

    if (rows[0].is_admin !== '1') {
      return res.status(403).json({
        Error: true,
        Code: 403,
        Status: 0,
        Message: 'Admin privileges required',
        Payload: {},
      });
    }

    // User is admin → proceed
    next();
  } catch (error) {
    console.error('[authorizeAdmin] Error checking admin:', error);
    res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: 'Internal server error',
      Payload: {},
    });
  }
};
