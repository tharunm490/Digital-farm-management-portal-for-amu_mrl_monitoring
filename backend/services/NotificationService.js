const db = require('../config/database');

class NotificationService {
  // Queue a notification
  static async queueNotification(notificationData) {
    try {
      const {
        user_id,
        farm_id,
        entity_id,
        notification_type,
        channel,
        title,
        message,
        payload,
        recipient_phone,
        recipient_email
      } = notificationData;

      const [result] = await db.execute(
        `INSERT INTO notification_queue 
         (user_id, farm_id, entity_id, notification_type, channel, title, message, payload, recipient_phone, recipient_email, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          farm_id,
          entity_id,
          notification_type,
          channel,
          title,
          message,
          payload ? JSON.stringify(payload) : null,
          recipient_phone,
          recipient_email,
          'pending'
        ]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error queuing notification:', error);
      throw error;
    }
  }

  // Send withdrawal period alert
  static async sendWithdrawalAlert(entityId, treatmentId, medicineData) {
    try {
      const {
        medicine,
        safe_date,
        user_id,
        farm_id,
        days_remaining
      } = medicineData;

      let severity = 'high';
      if (days_remaining <= 1) severity = 'critical';
      if (days_remaining > 3) severity = 'medium';

      const title = days_remaining === 0 
        ? `⏰ SAFE TO SELL: ${medicine}` 
        : `⚠️ Withdrawal Alert: ${medicine}`;

      const message = days_remaining === 0
        ? `The withdrawal period for ${medicine} has ended. Your product is now safe to sell.`
        : `Withdrawal period for ${medicine} ends in ${days_remaining} day${days_remaining > 1 ? 's' : ''}. Safe sale date: ${new Date(safe_date).toLocaleDateString()}`;

      // Queue in-app notification
      await this.queueNotification({
        user_id,
        farm_id,
        entity_id: entityId,
        notification_type: 'withdrawal_alert',
        channel: 'in_app',
        title,
        message,
        payload: {
          entity_id: entityId,
          treatment_id: treatmentId,
          medicine,
          safe_date,
          days_remaining
        }
      });

      // Queue SMS if user has phone
      const [user] = await db.execute(
        'SELECT f.phone FROM farmers f JOIN users u ON f.user_id = u.user_id WHERE u.user_id = ?',
        [user_id]
      );

      if (user.length && user[0].phone) {
        await this.queueNotification({
          user_id,
          farm_id,
          entity_id: entityId,
          notification_type: 'withdrawal_alert',
          channel: 'sms',
          title: `Withdrawal: ${medicine}`,
          message: `${medicine} safe to sell on ${new Date(safe_date).toLocaleDateString()}`,
          recipient_phone: user[0].phone,
          payload: {
            entity_id: entityId,
            medicine,
            safe_date
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Error sending withdrawal alert:', error);
      throw error;
    }
  }

  // Send MRL risk alert
  static async sendMRLAlert(amuId, riskData) {
    try {
      const {
        farm_id,
        entity_id,
        user_id,
        medicine,
        mrl_risk,
        risk_category
      } = riskData;

      const title = risk_category === 'unsafe' 
        ? `🔴 HIGH MRL RISK: ${medicine}`
        : `🟡 MRL BORDERLINE: ${medicine}`;

      const message = risk_category === 'unsafe'
        ? `${medicine} shows unsafe MRL levels (Risk: ${(mrl_risk * 100).toFixed(1)}%). Recommend testing before sale.`
        : `${medicine} shows borderline MRL levels (Risk: ${(mrl_risk * 100).toFixed(1)}%). Consider testing.`;

      await this.queueNotification({
        user_id,
        farm_id,
        entity_id,
        notification_type: 'mrl_risk',
        channel: 'in_app',
        title,
        message,
        payload: {
          entity_id,
          medicine,
          mrl_risk,
          risk_category
        }
      });

      return true;
    } catch (error) {
      console.error('Error sending MRL alert:', error);
      throw error;
    }
  }

  // Send compliance violation alert
  static async sendComplianceAlert(alertData) {
    try {
      const {
        farm_id,
        entity_id,
        user_id,
        alert_type,
        severity,
        message
      } = alertData;

      const severityIcon = {
        'low': '💡',
        'medium': '⚠️',
        'high': '🔴',
        'critical': '⛔'
      };

      const title = `${severityIcon[severity]} ${alert_type.replace(/_/g, ' ').toUpperCase()}`;

      await this.queueNotification({
        user_id,
        farm_id,
        entity_id,
        notification_type: 'compliance_violation',
        channel: 'in_app',
        title,
        message,
        payload: {
          entity_id,
          alert_type,
          severity
        }
      });

      // Send critical alerts via SMS
      if (severity === 'critical') {
        const [user] = await db.execute(
          'SELECT f.phone FROM farmers f JOIN users u ON f.user_id = u.user_id WHERE u.user_id = ?',
          [user_id]
        );

        if (user.length && user[0].phone) {
          await this.queueNotification({
            user_id,
            farm_id,
            entity_id,
            notification_type: 'compliance_violation',
            channel: 'sms',
            title: 'CRITICAL ALERT',
            message: message.substring(0, 160),
            recipient_phone: user[0].phone
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error sending compliance alert:', error);
      throw error;
    }
  }

  // Send safe sale date reached alert
  static async sendSafeSaleDateAlert(entityId, treatmentId, medicineData) {
    try {
      const {
        medicine,
        safe_date,
        user_id,
        farm_id
      } = medicineData;

      const title = `✅ ${medicine} NOW SAFE TO SELL`;
      const message = `${medicine} withdrawal period has completed. Product is safe for sale as of today.`;

      await this.queueNotification({
        user_id,
        farm_id,
        entity_id: entityId,
        notification_type: 'safe_sale_date',
        channel: 'in_app',
        title,
        message,
        payload: {
          entity_id: entityId,
          treatment_id: treatmentId,
          medicine,
          safe_date
        }
      });

      return true;
    } catch (error) {
      console.error('Error sending safe sale date alert:', error);
      throw error;
    }
  }

  // Send veterinarian recommendation
  static async sendVetRecommendation(farmId, userId, recommendationData) {
    try {
      const {
        title,
        message,
        recommendation_type
      } = recommendationData;

      await this.queueNotification({
        user_id: userId,
        farm_id: farmId,
        notification_type: 'recommendation',
        channel: 'in_app',
        title,
        message,
        payload: {
          recommendation_type
        }
      });

      return true;
    } catch (error) {
      console.error('Error sending vet recommendation:', error);
      throw error;
    }
  }

  // Get user notifications
  static async getUserNotifications(userId, limit = 20, offset = 0) {
    try {
      const [notifications] = await db.execute(
        `SELECT * FROM notification_queue 
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      const [count] = await db.execute(
        'SELECT COUNT(*) as total FROM notification_queue WHERE user_id = ?',
        [userId]
      );

      return {
        notifications,
        total: count[0].total,
        unread: notifications.filter(n => !n.read_at).length
      };
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId) {
    try {
      await db.execute(
        'UPDATE notification_queue SET read_at = NOW() WHERE notification_id = ?',
        [notificationId]
      );
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId) {
    try {
      await db.execute(
        'UPDATE notification_queue SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
        [userId]
      );
      return true;
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }

  // Get pending notifications (for batch processing)
  static async getPendingNotifications(limit = 10) {
    try {
      const [notifications] = await db.execute(
        `SELECT * FROM notification_queue 
         WHERE status = 'pending' AND retry_count < 3
         ORDER BY created_at ASC
         LIMIT ?`,
        [limit]
      );

      return notifications;
    } catch (error) {
      console.error('Error fetching pending notifications:', error);
      throw error;
    }
  }

  // Update notification status
  static async updateNotificationStatus(notificationId, status, errorMessage = null) {
    try {
      const [result] = await db.execute(
        `UPDATE notification_queue 
         SET status = ?, sent_at = NOW(), error_message = ?
         WHERE notification_id = ?`,
        [status, errorMessage, notificationId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating notification status:', error);
      throw error;
    }
  }

  // Increment retry count
  static async incrementRetryCount(notificationId) {
    try {
      await db.execute(
        'UPDATE notification_queue SET retry_count = retry_count + 1 WHERE notification_id = ?',
        [notificationId]
      );
      return true;
    } catch (error) {
      console.error('Error incrementing retry count:', error);
      throw error;
    }
  }

  // Get notification statistics
  static async getNotificationStats(userId) {
    try {
      const [stats] = await db.execute(
        `SELECT 
          notification_type,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) as read
         FROM notification_queue
         WHERE user_id = ?
         GROUP BY notification_type`,
        [userId]
      );

      return stats;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
