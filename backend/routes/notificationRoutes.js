const express = require('express');
const router = express.Router();
const NotificationService = require('../services/NotificationService');
const { authMiddleware } = require('../middleware/auth');

// Get all notifications for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id || req.user.id;
    if (!user_id) {
      return res.status(400).json({ error: 'User ID not found' });
    }
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await NotificationService.getUserNotifications(user_id, limit, offset);
    res.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await NotificationService.markAsRead(id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all as read
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id || req.user.id;
    await NotificationService.markAllAsRead(user_id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Get notification stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.user_id || req.user.id;
    const stats = await NotificationService.getNotificationStats(user_id);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ error: 'Failed to fetch notification stats' });
  }
});

module.exports = router;