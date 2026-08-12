import db from '../config/db.js';
import logger from '../utils/logger.js';

/**
 * Fetch all notifications for logged-in user
 */
export async function getNotifications(req, res) {
  try {
    const notificationsRes = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    return res.status(200).json({ success: true, data: notificationsRes.rows });
  } catch (err) {
    logger.error(`Error loading notifications: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving alerts.' });
  }
}

/**
 * Mark a notification as read
 */
export async function markRead(req, res) {
  const { id } = req.params;

  try {
    const checkNotification = await db.query('SELECT * FROM notifications WHERE id = $1', [id]);
    if (checkNotification.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    // Access control
    if (checkNotification.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await db.query('UPDATE notifications SET status = $1 WHERE id = $2', ['read', id]);

    return res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    logger.error(`Error marking notification as read: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error updating notification status.' });
  }
}

/**
 * Mark all user notifications as read
 */
export async function markAllRead(req, res) {
  try {
    await db.query('UPDATE notifications SET status = $1 WHERE user_id = $2', ['read', req.user.id]);
    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    logger.error(`Error marking all read: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error updating notifications.' });
  }
}
