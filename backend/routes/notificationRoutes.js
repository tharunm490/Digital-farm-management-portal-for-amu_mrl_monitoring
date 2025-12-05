const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');

// Get all notifications for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id || req.user.id;
    if (!user_id) {
      return res.status(400).json({ error: 'User ID not found' });
    }
    const limit = parseInt(req.query.limit) || 50;
    const notifications = await Notification.getByUser(user_id, limit);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get notifications by type
router.get('/type/:type', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id || req.user.id;
    const { type } = req.params;
    console.log('Fetching notifications for user_id:', user_id, 'type:', type);
    if (!user_id) {
      return res.status(400).json({ error: 'User ID not found' });
    }
    let actualType = type;
    let subtype = null;
    
    // Handle different type mappings
    if (type === 'mrl_alert') {
      actualType = 'alert';
      subtype = 'unsafe_mrl';
    } else if (type === 'high_dosage') {
      actualType = 'alert';
      subtype = 'high_dosage';
    } else if (type === 'overdosage') {
      actualType = 'alert';
      subtype = 'overdosage';
    } else if (type === 'all_alerts') {
      // Get all alerts regardless of subtype
      actualType = 'alert';
      subtype = null;
    } else if (type !== 'vaccination' && type !== 'alert') {
      return res.status(400).json({ error: 'Invalid notification type' });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const notifications = await Notification.getByType(user_id, actualType, subtype, limit);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications by type:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread notifications (for now, all are unread)
router.get('/unread', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id || req.user.id;
    if (!user_id) {
      return res.status(400).json({ error: 'User ID not found' });
    }
    const notifications = await Notification.getUnread(user_id);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({ error: 'Failed to fetch unread notifications' });
  }
});

// Mark notification as read (placeholder)
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id || req.user.id;
    if (!user_id) {
      return res.status(400).json({ error: 'User ID not found' });
    }
    const { id } = req.params;
    await Notification.markAsRead(id, user_id);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

module.exports = router;