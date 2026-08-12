import db from '../config/db.js';
import { logAuditEvent } from '../middleware/auth.js';
import logger from '../utils/logger.js';

/**
 * Get all users list (Admin/Officer role)
 */
export async function getUsers(req, res) {
  try {
    const usersRes = await db.query('SELECT id, email, full_name, phone_number, national_id, role, status, created_at FROM users ORDER BY created_at DESC');
    return res.status(200).json({ success: true, data: usersRes.rows });
  } catch (err) {
    logger.error(`Error loading users: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving users.' });
  }
}

/**
 * Toggle citizen user active/suspended state
 */
export async function updateUserStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body; // active, suspended

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status. Must be active or suspended.' });
  }

  try {
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const targetUser = userRes.rows[0];

    // Prevent administrators from suspending themselves
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot suspend your own account.' });
    }

    await db.query('UPDATE users SET status = $1, updated_at = $2 WHERE id = $3', [status, new Date().toISOString(), id]);
    await logAuditEvent(req.user.id, 'USER_STATUS_CHANGE', `Toggled User ${targetUser.email} status to ${status}`);

    return res.status(200).json({ success: true, message: `User status changed to ${status} successfully.` });
  } catch (err) {
    logger.error(`Error updating user status: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error updating user status.' });
  }
}

/**
 * Admin CRUD: Create a Partner Bank
 */
export async function createBank(req, res) {
  const { name, code, logoUrl, rating } = req.body;

  if (!name || !code) {
    return res.status(400).json({ success: false, message: 'Bank name and code are required.' });
  }

  try {
    const newId = 'b-' + Math.random().toString(36).substr(2, 9);
    await db.query(
      `INSERT INTO banks (id, name, code, logo_url, rating, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newId, name, code, logoUrl || '', rating || 0.0, new Date().toISOString(), new Date().toISOString()]
    );

    await logAuditEvent(req.user.id, 'BANK_CREATE', `Created partner bank: ${name} (${code})`);

    return res.status(201).json({ success: true, message: 'Bank registered successfully.', id: newId });
  } catch (err) {
    logger.error(`Error creating bank: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error registering bank.' });
  }
}

/**
 * Admin CRUD: Edit Bank details
 */
export async function updateBank(req, res) {
  const { id } = req.params;
  const { name, code, logoUrl, rating } = req.body;

  try {
    const checkBank = await db.query('SELECT * FROM banks WHERE id = $1', [id]);
    if (checkBank.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bank not found.' });
    }

    const current = checkBank.rows[0];
    await db.query(
      `UPDATE banks
       SET name = $1, code = $2, logo_url = $3, rating = $4, updated_at = $5
       WHERE id = $6`,
      [name || current.name, code || current.code, logoUrl || current.logo_url, rating || current.rating, new Date().toISOString(), id]
    );

    await logAuditEvent(req.user.id, 'BANK_UPDATE', `Updated bank ID: ${id}`);

    return res.status(200).json({ success: true, message: 'Bank details updated successfully.' });
  } catch (err) {
    logger.error(`Error updating bank: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error updating bank.' });
  }
}

/**
 * Admin CRUD: Delete Bank
 */
export async function deleteBank(req, res) {
  const { id } = req.params;

  try {
    const checkBank = await db.query('SELECT * FROM banks WHERE id = $1', [id]);
    if (checkBank.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bank not found.' });
    }

    await db.query('DELETE FROM banks WHERE id = $1', [id]);
    await logAuditEvent(req.user.id, 'BANK_DELETE', `Removed bank ID: ${id}`);

    return res.status(200).json({ success: true, message: 'Bank removed from system.' });
  } catch (err) {
    logger.error(`Error deleting bank: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error deleting bank.' });
  }
}

/**
 * Fetch System Audit Logs
 */
export async function getAuditLogs(req, res) {
  try {
    const logsRes = await db.query(
      `SELECT al.*, u.full_name as user_name, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT 100`
    );

    return res.status(200).json({ success: true, data: logsRes.rows });
  } catch (err) {
    logger.error(`Error retrieving audit trail: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error fetching audit trail.' });
  }
}

/**
 * System analytics calculations
 */
export async function getDashboardAnalytics(req, res) {
  try {
    // 1. Core counters
    const appsRes = await db.query('SELECT id, amount, status, user_id, loan_product_id, created_at FROM applications');
    const usersRes = await db.query('SELECT id, role, created_at FROM users');
    const banksRes = await db.query('SELECT id, name FROM banks');

    const totalApplications = appsRes.rows.length;
    const totalCitizens = usersRes.rows.filter(u => u.role === 'citizen').length;

    // Aggregate status distributions
    const statusCounts = {};
    let approvedCount = 0;
    let disbursedVolume = 0;

    appsRes.rows.forEach(app => {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
      if (app.status === 'approved' || app.status === 'disbursed') {
        approvedCount++;
      }
      if (app.status === 'disbursed') {
        disbursedVolume += parseFloat(app.amount || 0);
      }
    });

    const approvalRate = totalApplications > 0 ? parseFloat(((approvedCount / totalApplications) * 100).toFixed(2)) : 0.0;

    // 2. Bank performance calculations
    const bankPerf = {};
    banksRes.rows.forEach(b => {
      bankPerf[b.id] = { name: b.name, total: 0, approved: 0 };
    });

    // Load products list to match application to bank
    const productsRes = await db.query('SELECT id, bank_id FROM loan_products');
    const prodToBankMap = {};
    productsRes.rows.forEach(p => {
      prodToBankMap[p.id] = p.bank_id;
    });

    appsRes.rows.forEach(app => {
      const bankId = prodToBankMap[app.loan_product_id];
      if (bankId && bankPerf[bankId]) {
        bankPerf[bankId].total++;
        if (app.status === 'approved' || app.status === 'disbursed') {
          bankPerf[bankId].approved++;
        }
      }
    });

    const bankPerformanceData = Object.values(bankPerf).map(bp => ({
      name: bp.name,
      totalCount: bp.total,
      approvedCount: bp.approved,
      rate: bp.total > 0 ? parseFloat(((bp.approved / bp.total) * 100).toFixed(2)) : 0.0
    }));

    // 3. Mock Geographic Distribution (Rwanda's Provinces)
    // In a real application, this would join with the user's residence district.
    // For demo purposes we distribute deterministically based on user ID hashes.
    const provinces = ['Kigali City', 'Eastern Province', 'Northern Province', 'Southern Province', 'Western Province'];
    const geoCounts = { 'Kigali City': 0, 'Eastern Province': 0, 'Northern Province': 0, 'Southern Province': 0, 'Western Province': 0 };

    appsRes.rows.forEach(app => {
      // Direct hash mapping of User UUID to distribute geographic data
      const charVal = app.user_id ? app.user_id.charCodeAt(app.user_id.length - 1) || 0 : 0;
      const idx = charVal % provinces.length;
      const selectedProvince = provinces[idx];
      geoCounts[selectedProvince]++;
    });

    const geographicDistribution = Object.keys(geoCounts).map(prov => ({
      province: prov,
      applicationsCount: geoCounts[prov]
    }));

    // 4. Monthly application velocity
    // Groups by month name for dashboard graphs
    const monthlyActivity = {};
    appsRes.rows.forEach(app => {
      const date = new Date(app.created_at);
      const monthLabel = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
      monthlyActivity[monthLabel] = (monthlyActivity[monthLabel] || 0) + 1;
    });

    const timelineData = Object.keys(monthlyActivity).map(lbl => ({
      month: lbl,
      count: monthlyActivity[lbl]
    }));

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalApplications,
          totalCitizens,
          approvalRate,
          disbursedVolumeRwf: disbursedVolume
        },
        statusCounts,
        bankPerformance: bankPerformanceData,
        geographicDistribution,
        timeline: timelineData
      }
    });
  } catch (err) {
    logger.error(`Error computing analytics: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error compiling dashboard analytics.' });
  }
}
