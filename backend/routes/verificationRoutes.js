const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const ComplianceEngine = require('../models/ComplianceEngine');
const BlockchainService = require('../services/BlockchainService');
const NotificationService = require('../services/NotificationService');

// Get pending verification batches (processor view)
router.get('/pending-verification', authMiddleware, async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'processor') {
      return res.status(403).json({ success: false, message: 'Only processors can access pending batches' });
    }

    const query = `
      SELECT bv.*, f.name as farm_name, f.location, a.species,
             d.name as drug_name, d.criticality,
             w.safe_date, w.withdrawal_days
      FROM batch_verification bv
      LEFT JOIN farms f ON bv.farm_id = f.id
      LEFT JOIN animals_or_batches a ON bv.batch_id = a.id
      LEFT JOIN drug_master d ON bv.drug_id = d.id
      LEFT JOIN withdrawal_tracking w ON bv.withdrawal_id = w.id
      WHERE bv.status = 'pending'
      ORDER BY bv.created_at ASC
    `;

    const [batches] = await db.promise().query(query);

    // Enrich with compliance status
    const enriched = batches.map(b => {
      const safeDate = b.safe_date ? new Date(b.safe_date) : null;
      const now = new Date();
      let status = 'safe';
      
      if (safeDate && safeDate > now) {
        status = 'unsafe';
      } else if (safeDate && Math.abs(safeDate - now) < 3 * 24 * 60 * 60 * 1000) {
        status = 'borderline';
      }

      return {
        ...b,
        compliance_status: status
      };
    });

    res.json({
      success: true,
      data: enriched,
      count: enriched.length
    });
  } catch (error) {
    console.error('Error fetching pending batches:', error);
    res.status(500).json({ success: false, message: 'Error fetching pending batches' });
  }
});

// Verify batch via QR code
router.post('/verify-qr', authMiddleware, async (req, res) => {
  try {
    const { qr_data, farm_id } = req.body;
    const processorId = req.user.id;

    if (req.user.role !== 'processor') {
      return res.status(403).json({ success: false, message: 'Only processors can verify batches' });
    }

    if (!qr_data) {
      return res.status(400).json({ success: false, message: 'QR data is required' });
    }

    // Parse QR code to get withdrawal ID or batch ID
    // Format: BATCH-ID or WITHDRAWAL-ID
    const id = qr_data.replace(/[A-Za-z-]/g, '');

    // Try to find withdrawal record
    const [withdrawals] = await db.promise().query(`
      SELECT w.*, f.name as farm_name, a.species, d.name as drug_name,
             m.withdrawal_days
      FROM withdrawal_tracking w
      LEFT JOIN farms f ON w.farm_id = f.id
      LEFT JOIN animals_or_batches a ON w.entity_id = a.id
      LEFT JOIN drug_master d ON w.drug_id = d.id
      LEFT JOIN mrl_reference m ON m.drug_id = d.id AND m.species = a.species
      WHERE w.id = ? OR w.entity_id = ?
    `, [id, id]);

    if (withdrawals.length === 0) {
      return res.status(404).json({ success: false, message: 'Batch not found in withdrawal records' });
    }

    const w = withdrawals[0];
    const safeDate = new Date(w.safe_date);
    const now = new Date();

    let complianceStatus = 'safe';
    if (safeDate > now) {
      complianceStatus = 'unsafe';
    } else if (Math.abs(safeDate - now) < 3 * 24 * 60 * 60 * 1000) {
      complianceStatus = 'borderline';
    }

    // Create batch verification record
    const insertQuery = `
      INSERT INTO batch_verification
      (farm_id, batch_id, withdrawal_id, drug_id, processor_id, qr_data,
       verification_date, compliance_status, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, 'pending', NOW())
    `;

    const [result] = await db.promise().query(insertQuery, [
      w.farm_id, w.entity_id, w.id, w.drug_id, processorId,
      qr_data, complianceStatus
    ]);

    const batchVerificationId = result.insertId;

    res.json({
      success: true,
      message: 'Batch scanned and verified',
      data: {
        id: batchVerificationId,
        farm: w.farm_name,
        species: w.species,
        drug: w.drug_name,
        withdrawal_id: w.id,
        safe_date: safeDate,
        compliance_status: complianceStatus,
        days_until_safe: Math.ceil((safeDate - now) / (1000 * 60 * 60 * 24)),
        can_accept: complianceStatus === 'safe'
      }
    });
  } catch (error) {
    console.error('Error verifying batch:', error);
    res.status(500).json({ success: false, message: 'Error verifying batch' });
  }
});

// Accept batch
router.post('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const processorId = req.user.id;

    if (req.user.role !== 'processor') {
      return res.status(403).json({ success: false, message: 'Only processors can accept batches' });
    }

    // Get batch verification record
    const [batches] = await db.promise().query(
      'SELECT * FROM batch_verification WHERE id = ? AND processor_id = ?',
      [id, processorId]
    );

    if (batches.length === 0) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const batch = batches[0];

    // Get withdrawal record to check safe date
    const [withdrawals] = await db.promise().query(
      'SELECT * FROM withdrawal_tracking WHERE id = ?',
      [batch.withdrawal_id]
    );

    if (withdrawals.length > 0) {
      const w = withdrawals[0];
      const safeDate = new Date(w.safe_date);
      const now = new Date();

      if (safeDate > now) {
        return res.status(400).json({
          success: false,
          message: 'Batch is not yet safe for processing. Withdrawal period not completed.',
          safe_date: safeDate,
          days_remaining: Math.ceil((safeDate - now) / (1000 * 60 * 60 * 24))
        });
      }
    }

    // Update batch status
    await db.promise().query(
      'UPDATE batch_verification SET status = ?, accepted_at = NOW() WHERE id = ?',
      ['accepted', id]
    );

    // Log to blockchain
    const blockchain = new BlockchainService();
    await blockchain.logDispatch({
      batch_id: id,
      withdrawal_id: batch.withdrawal_id,
      processor_id: processorId,
      action: 'accepted'
    });

    // Send notification to farm
    const notification = new NotificationService();
    await notification.queueNotification({
      user_id: batch.farm_id,
      type: 'batch_accepted',
      title: 'Batch Accepted',
      message: `Your batch has been accepted by the processor`,
      related_id: id,
      related_type: 'batch'
    });

    res.json({
      success: true,
      message: 'Batch accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting batch:', error);
    res.status(500).json({ success: false, message: 'Error accepting batch' });
  }
});

// Reject batch
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const processorId = req.user.id;

    if (req.user.role !== 'processor') {
      return res.status(403).json({ success: false, message: 'Only processors can reject batches' });
    }

    // Get batch record
    const [batches] = await db.promise().query(
      'SELECT * FROM batch_verification WHERE id = ? AND processor_id = ?',
      [id, processorId]
    );

    if (batches.length === 0) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const batch = batches[0];

    // Update status
    await db.promise().query(
      'UPDATE batch_verification SET status = ?, rejection_reason = ?, rejected_at = NOW() WHERE id = ?',
      ['rejected', reason || null, id]
    );

    // Log to blockchain
    const blockchain = new BlockchainService();
    await blockchain.logDispatch({
      batch_id: id,
      withdrawal_id: batch.withdrawal_id,
      processor_id: processorId,
      action: 'rejected',
      reason: reason
    });

    // Send notification
    const notification = new NotificationService();
    await notification.sendComplianceAlert({
      farm_id: batch.farm_id,
      alert_type: 'batch_rejection',
      message: `Your batch #${id} has been rejected. Reason: ${reason || 'Not specified'}`
    });

    res.json({
      success: true,
      message: 'Batch rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting batch:', error);
    res.status(500).json({ success: false, message: 'Error rejecting batch' });
  }
});

// Hold batch for testing
router.post('/:id/hold', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, testing_required } = req.body;
    const processorId = req.user.id;

    if (req.user.role !== 'processor') {
      return res.status(403).json({ success: false, message: 'Only processors can hold batches' });
    }

    // Get batch record
    const [batches] = await db.promise().query(
      'SELECT * FROM batch_verification WHERE id = ? AND processor_id = ?',
      [id, processorId]
    );

    if (batches.length === 0) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    // Update status
    await db.promise().query(
      'UPDATE batch_verification SET status = ?, hold_reason = ?, testing_required = ?, updated_at = NOW() WHERE id = ?',
      ['on_hold', reason || null, testing_required || 0, id]
    );

    // Notify authority
    const notification = new NotificationService();
    await notification.sendComplianceAlert({
      batch_id: id,
      alert_type: 'batch_hold',
      message: `Batch #${id} has been placed on hold for testing. Reason: ${reason || 'Not specified'}`
    });

    res.json({
      success: true,
      message: 'Batch placed on hold for testing'
    });
  } catch (error) {
    console.error('Error holding batch:', error);
    res.status(500).json({ success: false, message: 'Error holding batch' });
  }
});

// Get batch statistics (processor dashboard)
router.get('/stats/today', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'processor') {
      return res.status(403).json({ success: false, message: 'Only processors can view statistics' });
    }

    const processorId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const [stats] = await db.promise().query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN compliance_status = 'safe' THEN 1 ELSE 0 END) as safe,
        SUM(CASE WHEN compliance_status = 'borderline' THEN 1 ELSE 0 END) as borderline,
        SUM(CASE WHEN compliance_status = 'unsafe' THEN 1 ELSE 0 END) as unsafe
      FROM batch_verification
      WHERE processor_id = ? AND DATE(created_at) = ?
    `, [processorId, today]);

    res.json({
      success: true,
      data: stats[0] || {
        total: 0,
        pending: 0,
        safe: 0,
        borderline: 0,
        unsafe: 0
      }
    });
  } catch (error) {
    console.error('Error fetching batch stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

module.exports = router;
