import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'demo_secret_imali_hub_key_2026_rwanda_fintech';

/**
 * Middleware: Verify JWT and attach user context to req.user
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Failed JWT validation attempt');
      return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

/**
 * Middleware: Authorize only specific user roles
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized. User context missing.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`User ${req.user.email} with role '${req.user.role}' attempted unauthorized access to route requiring roles: [${allowedRoles.join(', ')}]`);
      return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
}

/**
 * Helper: Insert audit trail log entry
 */
export async function logAuditEvent(userId, action, details, ipAddress = '0.0.0.0') {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, user_id, action, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'al-' + Math.random().toString(36).substr(2, 9),
        userId,
        action,
        details,
        ipAddress,
        new Date().toISOString()
      ]
    );
    logger.debug(`Audit logged: User ${userId} performed ${action}`);
  } catch (err) {
    logger.error(`Failed to record audit log: ${err.message}`);
  }
}
