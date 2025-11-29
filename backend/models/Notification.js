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
    // Get user role
    const userQuery = `SELECT role FROM users WHERE user_id = ?`;
    const [userRows] = await db.execute(userQuery, [user_id]);
    const role = userRows[0]?.role;

    let query;
    let params;

    if (role === 'veterinarian') {
      // For vets, get their own notifications plus notifications from farmers of mapped farms
      query = `
        SELECT n.* FROM notification_history n
        WHERE n.user_id = ? OR n.user_id IN (
          SELECT u.user_id FROM users u
          JOIN farmers f ON u.user_id = f.user_id
          JOIN farms fa ON f.farmer_id = fa.farmer_id
          JOIN vet_farm_mapping vfm ON fa.farm_id = vfm.farm_id
          JOIN veterinarians v ON vfm.vet_id = v.vet_id
          WHERE v.user_id = ?
        )
        ORDER BY created_at DESC
        LIMIT ${parseInt(limit)}
      `;
      params = [user_id, user_id];
    } else {
      // For farmers and others, get their own notifications
      query = `
        SELECT * FROM notification_history
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ${parseInt(limit)}
      `;
      params = [user_id];
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }

  // Get notifications by type for a user
  static async getByType(user_id, type, subtype = null, limit = 50) {
    console.log('getByType called with:', { user_id, type, subtype, limit });

    // Get user role
    const userQuery = `SELECT role FROM users WHERE user_id = ?`;
    const [userRows] = await db.execute(userQuery, [user_id]);
    const role = userRows[0]?.role;

    let query;
    let params;

    if (role === 'veterinarian') {
      // For vets, get their own notifications plus notifications from farmers of mapped farms
      if (subtype) {
        query = `
          SELECT n.* FROM notification_history n
          WHERE (n.user_id = ? OR n.user_id IN (
            SELECT u.user_id FROM users u
            JOIN farmers f ON u.user_id = f.user_id
            JOIN farms fa ON f.farmer_id = fa.farmer_id
            JOIN vet_farm_mapping vfm ON fa.farm_id = vfm.farm_id
            JOIN veterinarians v ON vfm.vet_id = v.vet_id
            WHERE v.user_id = ?
          )) AND n.type = ? AND n.subtype = ?
          ORDER BY created_at DESC
        `;
        params = [user_id, user_id, type, subtype];
      } else {
        query = `
          SELECT n.* FROM notification_history n
          WHERE (n.user_id = ? OR n.user_id IN (
            SELECT u.user_id FROM users u
            JOIN farmers f ON u.user_id = f.user_id
            JOIN farms fa ON f.farmer_id = fa.farmer_id
            JOIN vet_farm_mapping vfm ON fa.farm_id = vfm.farm_id
            JOIN veterinarians v ON vfm.vet_id = v.vet_id
            WHERE v.user_id = ?
          )) AND n.type = ?
          ORDER BY created_at DESC
        `;
        params = [user_id, user_id, type];
      }
    } else {
      // For farmers and others, get their own notifications
      if (subtype) {
        query = `
          SELECT * FROM notification_history
          WHERE user_id = ? AND type = ? AND subtype = ?
          ORDER BY created_at DESC
        `;
        params = [user_id, type, subtype];
      } else {
        query = `
          SELECT * FROM notification_history
          WHERE user_id = ? AND type = ?
          ORDER BY created_at DESC
        `;
        params = [user_id, type];
      }
    }

    console.log('Executing query:', query);
    console.log('With params:', params);

    const [rows] = await db.execute(query, params);
    return rows.slice(0, limit); // Apply limit in JavaScript
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