const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const ComplianceEngine = require('../models/ComplianceEngine');
const BlockchainService = require('../services/BlockchainService');
const NotificationService = require('../services/NotificationService');

// Get all withdrawal records (farmer view)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { farm_id, status, limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT w.*, f.name as farm_name, a.identifier as animal_id, a.species,
             d.name as drug_name, d.criticality,
             m.withdrawal_days, m.safe_date_calc
      FROM withdrawal_tracking w
      LEFT JOIN farms f ON w.farm_id = f.id
      LEFT JOIN animals_or_batches a ON w.entity_id = a.id
      LEFT JOIN drug_master d ON w.drug_id = d.id
      LEFT JOIN mrl_reference m ON m.drug_id = d.id AND m.species = a.species
      WHERE 1=1
    `;
    const params = [];

    // Farmer can only see their own farm
    if (userRole === 'farmer') {
      query += ' AND w.farm_id = ?';
      params.push(userId);
    } else if (farm_id) {
      query += ' AND w.farm_id = ?';
      params.push(farm_id);
    }

    // Status filter
    if (status) {
      query += ' AND w.status = ?';
      params.push(status);
    }

    query += ' ORDER BY w.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [withdrawals] = await db.promise().query(query, params);

    // Enrich with calculated days remaining
    const enriched = withdrawals.map(w => ({
      ...w,
      days_remaining: Math.max(0, Math.ceil((new Date(w.safe_date) - new Date()) / (1000 * 60 * 60 * 24)))
    }));

    res.json({
      success: true,
      data: enriched,
      count: enriched.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({ success: false, message: 'Error fetching withdrawal records' });
  }
});

// Get withdrawal details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const query = `
      SELECT w.*, f.name as farm_name, a.identifier as animal_id, a.species,
             d.name as drug_name, d.criticality,
             m.withdrawal_days, m.safe_date_calc
      FROM withdrawal_tracking w
      LEFT JOIN farms f ON w.farm_id = f.id
      LEFT JOIN animals_or_batches a ON w.entity_id = a.id
      LEFT JOIN drug_master d ON w.drug_id = d.id
      LEFT JOIN mrl_reference m ON m.drug_id = d.id AND m.species = a.species
      WHERE w.id = ? AND (w.farm_id = ? OR ? = 'authority')
    `;

    const [withdrawals] = await db.promise().query(query, [id, userId, req.user.role]);

    if (withdrawals.length === 0) {
      return res.status(404).json({ success: false, message: 'Withdrawal record not found' });
    }

    const w = withdrawals[0];
    const daysRemaining = Math.max(0, Math.ceil((new Date(w.safe_date) - new Date()) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      data: {
        ...w,
        days_remaining: daysRemaining,
        is_safe: daysRemaining === 0
      }
    });
  } catch (error) {
    console.error('Error fetching withdrawal:', error);
    res.status(500).json({ success: false, message: 'Error fetching withdrawal record' });
  }
});

// Record treatment (creates withdrawal record)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      farm_id,
      entity_id,
      entity_type,
      drug_id,
      treatment_date,
      dosage_applied
    } = req.body;

    const userRole = req.user.role;

    if (userRole !== 'farmer') {
      return res.status(403).json({ success: false, message: 'Only farmers can record treatments' });
    }

    // Validate required fields
    if (!farm_id || !entity_id || !drug_id || !treatment_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Get drug info
    const [drugs] = await db.promise().query(
      'SELECT * FROM drug_master WHERE id = ?',
      [drug_id]
    );

    if (drugs.length === 0) {
      return res.status(404).json({ success: false, message: 'Drug not found' });
    }

    // Get entity species
    const [entities] = await db.promise().query(
      'SELECT * FROM animals_or_batches WHERE id = ? AND farm_id = ?',
      [entity_id, farm_id]
    );

    if (entities.length === 0) {
      return res.status(404).json({ success: false, message: 'Entity not found or not owned by you' });
    }

    const entity = entities[0];

    // Get MRL/withdrawal days
    const [mrlData] = await db.promise().query(`
      SELECT * FROM mrl_reference
      WHERE drug_id = ? AND species = ?
      LIMIT 1
    `, [drug_id, entity.species]);

    let withdrawalDays = 0;
    if (mrlData.length > 0) {
      withdrawalDays = mrlData[0].withdrawal_days || 0;
    }

    // Calculate safe date
    const treatmentDateObj = new Date(treatment_date);
    const safeDate = new Date(treatmentDateObj);
    safeDate.setDate(safeDate.getDate() + withdrawalDays);

    // Insert withdrawal record
    const insertQuery = `
      INSERT INTO withdrawal_tracking
      (farm_id, entity_id, entity_type, drug_id, treatment_date, withdrawal_days,
       safe_date, dosage_applied, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', NOW())
    `;

    const [result] = await db.promise().query(insertQuery, [
      farm_id, entity_id, entity_type, drug_id, treatment_date,
      withdrawalDays, safeDate, dosage_applied || null
    ]);

    const withdrawalId = result.insertId;

    // Log to blockchain
    const blockchain = new BlockchainService();
    await blockchain.logTreatment({
      withdrawal_id: withdrawalId,
      farm_id,
      entity_id,
      drug_id,
      treatment_date,
      withdrawal_days: withdrawalDays
    });

    // Send notification
    const notification = new NotificationService();
    if (withdrawalDays > 0) {
      await notification.sendWithdrawalAlert(withdrawalId, safeDate);
    }

    res.status(201).json({
      success: true,
      message: 'Treatment recorded successfully',
      data: {
        id: withdrawalId,
        safe_date: safeDate,
        withdrawal_days: withdrawalDays,
        status: 'in_progress'
      }
    });
  } catch (error) {
    console.error('Error recording treatment:', error);
    res.status(500).json({ success: false, message: 'Error recording treatment' });
  }
});

// Mark product as safe for sale
router.post('/:id/sale', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { sale_date, quantity_sold, destination } = req.body;
    const userId = req.user.id;

    if (req.user.role !== 'farmer') {
      return res.status(403).json({ success: false, message: 'Only farmers can mark products for sale' });
    }

    // Get withdrawal record
    const [withdrawals] = await db.promise().query(
      'SELECT * FROM withdrawal_tracking WHERE id = ? AND farm_id = ?',
      [id, userId]
    );

    if (withdrawals.length === 0) {
      return res.status(404).json({ success: false, message: 'Withdrawal record not found' });
    }

    const w = withdrawals[0];
    const saleDateObj = new Date(sale_date);

    // Check if safe date has passed
    const safeDate = new Date(w.safe_date);
    if (saleDateObj < safeDate) {
      const daysShort = Math.ceil((safeDate - saleDateObj) / (1000 * 60 * 60 * 24));
      return res.status(400).json({
        success: false,
        message: `Not safe for sale yet. Wait ${daysShort} more days.`,
        safe_date: safeDate,
        days_remaining: daysShort
      });
    }

    // Update withdrawal record
    const updateQuery = `
      UPDATE withdrawal_tracking
      SET status = 'completed', sale_date = ?, quantity_sold = ?, destination = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await db.promise().query(updateQuery, [sale_date, quantity_sold || null, destination || null, id]);

    // Log to blockchain
    const blockchain = new BlockchainService();
    await blockchain.logDispatch({
      withdrawal_id: id,
      sale_date: saleDateObj,
      quantity_sold: quantity_sold || null,
      destination: destination || null
    });

    res.json({
      success: true,
      message: 'Product marked as sold successfully'
    });
  } catch (error) {
    console.error('Error recording sale:', error);
    res.status(500).json({ success: false, message: 'Error recording sale' });
  }
});

// Hold/Quarantine product
router.post('/:id/hold', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, hold_until } = req.body;
    const userId = req.user.id;

    if (req.user.role !== 'farmer') {
      return res.status(403).json({ success: false, message: 'Only farmers can hold products' });
    }

    // Get withdrawal record
    const [withdrawals] = await db.promise().query(
      'SELECT * FROM withdrawal_tracking WHERE id = ? AND farm_id = ?',
      [id, userId]
    );

    if (withdrawals.length === 0) {
      return res.status(404).json({ success: false, message: 'Withdrawal record not found' });
    }

    // Update status
    await db.promise().query(
      'UPDATE withdrawal_tracking SET status = ?, hold_reason = ?, hold_until = ?, updated_at = NOW() WHERE id = ?',
      ['on_hold', reason || null, hold_until || null, id]
    );

    // Notify authority
    const notification = new NotificationService();
    await notification.sendComplianceAlert({
      farm_id: withdrawals[0].farm_id,
      alert_type: 'hold_notification',
      message: `Product hold initiated for withdrawal record #${id}. Reason: ${reason || 'Not specified'}`
    });

    res.json({
      success: true,
      message: 'Product placed on hold'
    });
  } catch (error) {
    console.error('Error holding product:', error);
    res.status(500).json({ success: false, message: 'Error holding product' });
  }
});

// Check compliance before sale
router.post('/:id/check-compliance', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { proposed_sale_date } = req.body;

    // Get withdrawal record
    const [withdrawals] = await db.promise().query(
      'SELECT * FROM withdrawal_tracking WHERE id = ?',
      [id]
    );

    if (withdrawals.length === 0) {
      return res.status(404).json({ success: false, message: 'Withdrawal record not found' });
    }

    const w = withdrawals[0];
    const proposedDate = new Date(proposed_sale_date);
    const safeDate = new Date(w.safe_date);

    const isCompliant = proposedDate >= safeDate;
    const daysRemaining = Math.max(0, Math.ceil((safeDate - proposedDate) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      data: {
        is_compliant: isCompliant,
        safe_date: safeDate,
        proposed_date: proposedDate,
        days_remaining: daysRemaining,
        message: isCompliant
          ? 'Product is safe for sale'
          : `Product cannot be sold yet. Wait ${daysRemaining} more days.`
      }
    });
  } catch (error) {
    console.error('Error checking compliance:', error);
    res.status(500).json({ success: false, message: 'Error checking compliance' });
  }
});

module.exports = router;
