import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { logAuditEvent } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'demo_secret_imali_hub_key_2026_rwanda_fintech';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register a new User
 */
export async function register(req, res) {
  const { email, password, fullName, phoneNumber, nationalId, role } = req.body;

  if (!email || !password || !fullName || !phoneNumber) {
    return res.status(400).json({ success: false, message: 'Required fields: email, password, fullName, phoneNumber.' });
  }

  // Determine user role (default to 'citizen')
  const assignedRole = role && ['citizen', 'bank_officer', 'admin'].includes(role) ? role : 'citizen';

  try {
    // Check if user already exists
    const checkUser = await db.query('SELECT * FROM users WHERE email = $1 OR phone_number = $2', [email, phoneNumber]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'A user with this email or phone number is already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUserId = 'u-' + Math.random().toString(36).substr(2, 9);

    // Insert user (initial status 'active' for demo ease, normally 'pending' until verified)
    await db.query(
      `INSERT INTO users (id, email, password_hash, full_name, phone_number, national_id, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        newUserId,
        email,
        passwordHash,
        fullName,
        phoneNumber,
        nationalId || null,
        assignedRole,
        'active',
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    // Create a welcome notification
    await db.query(
      `INSERT INTO notifications (id, user_id, title, message, channel, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'n-' + Math.random().toString(36).substr(2, 9),
        newUserId,
        'Welcome to Imali Hub!',
        `Muraho ${fullName}, your account has been registered successfully. Explore loans and apply.`,
        'in_app',
        'sent',
        new Date().toISOString()
      ]
    );

    // Write audit trail
    await logAuditEvent(newUserId, 'USER_REGISTER', `User registered with email: ${email}, role: ${assignedRole}`);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully. Welcome to Imali Hub!'
    });
  } catch (err) {
    logger.error(`Registration error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
}

/**
 * Login existing User
 */
export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = checkUser.rows[0];

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        phoneNumber: user.phone_number,
        nationalId: user.national_id
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Audit Log
    await logAuditEvent(user.id, 'USER_LOGIN', `Successful login from ${req.ip || 'unknown'}`);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        phoneNumber: user.phone_number,
        nationalId: user.national_id
      }
    });
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
}

/**
 * Mock Request Password Reset
 */
export async function requestPasswordReset(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  try {
    const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length === 0) {
      // Don't disclose user existence for security, return mock success
      return res.status(200).json({ success: true, message: 'If the email exists, a reset link has been dispatched.' });
    }

    const user = checkUser.rows[0];
    const mockResetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Log the reset event (containing code for visual confirmation in demo)
    await logAuditEvent(user.id, 'PASSWORD_RESET_REQUEST', `Reset code generated: ${mockResetCode}`);
    logger.info(`[SMTP Simulator] Password reset code for ${email} is: ${mockResetCode}`);

    return res.status(200).json({
      success: true,
      message: 'Reset instructions sent. Please check your inbox (or server console logs in sandbox).',
      code: mockResetCode // returned for sandbox verification ease
    });
  } catch (err) {
    logger.error(`Password reset request error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error processing password reset.' });
  }
}

/**
 * Mock Reset Password execution
 */
export async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email, verification code, and new password are required.' });
  }

  try {
    const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'User not found.' });
    }

    const user = checkUser.rows[0];

    // Password hashing
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [
      passwordHash,
      new Date().toISOString(),
      user.id
    ]);

    await logAuditEvent(user.id, 'PASSWORD_RESET_EXECUTE', 'Password successfully reset.');

    return res.status(200).json({ success: true, message: 'Password updated successfully. You can now login.' });
  } catch (err) {
    logger.error(`Password reset execution error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error resetting password.' });
  }
}

/**
 * Mock Email Verification
 */
export async function verifyEmail(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  try {
    const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'User not found.' });
    }

    const user = checkUser.rows[0];

    await logAuditEvent(user.id, 'EMAIL_VERIFIED', `Verified email: ${email}`);

    return res.status(200).json({
      success: true,
      message: `Email ${email} has been successfully verified in the registry.`
    });
  } catch (err) {
    logger.error(`Email verification error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error verifying email.' });
  }
}
