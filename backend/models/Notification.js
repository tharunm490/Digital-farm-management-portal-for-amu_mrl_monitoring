const db = require('../config/database');

class Notification {
  // Create new notification
  static async create(notificationData) {
    const {
      user_id,
      type,
      subtype = null,
      message,
      entity_id = null,
      treatment_id = null,
      amu_id = null,
      vacc_id = null
    } = notificationData;

    if (!user_id || !type || !message) {
      throw new Error(`Missing required fields: user_id=${user_id}, type=${type}, message=${message}`);
    }

    const query = `
      INSERT INTO notification_history (
        user_id, type, subtype, message, entity_id, treatment_id, amu_id, vacc_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      user_id,
      type,
      subtype,
      message,
      entity_id,
      treatment_id,
      amu_id,
      vacc_id
    ]);

    return result.insertId;
  }

  // Get notifications for a user
  static async getByUser(user_id, limit = 50) {
    const query = `
      SELECT * FROM notification_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    const [rows] = await db.execute(query, [user_id, limit]);
    return rows;
  }

  // Get notifications by type for a user
  static async getByType(user_id, type, subtype = null, limit = 50) {
    const query = `
      SELECT * FROM notification_history
      WHERE user_id = ? AND type = ? AND (subtype = ? OR ? IS NULL)
      ORDER BY created_at DESC
      LIMIT ?
    `;
    const [rows] = await db.execute(query, [user_id, type, subtype, subtype, limit]);
    return rows;
  }

  // Get unread notifications
  static async getUnread(user_id) {
    const query = `
      SELECT * FROM notification_history
      WHERE user_id = ? AND is_read = FALSE
      ORDER BY created_at DESC
    `;
    const [rows] = await db.execute(query, [user_id]);
    return rows;
  }

  // Mark as read
  static async markAsRead(notification_id, user_id) {
    const query = `
      UPDATE notification_history
      SET is_read = TRUE
      WHERE notification_id = ? AND user_id = ?
    `;
    await db.execute(query, [notification_id, user_id]);
  }
}

module.exports = Notification;