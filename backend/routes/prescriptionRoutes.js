const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const DrugMaster = require('../models/DrugMaster');
const BlockchainService = require('../services/BlockchainService');
const NotificationService = require('../services/NotificationService');

// Get all prescriptions (filtered by user role)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, farm_id, vet_id, limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT p.prescription_id, p.vet_id, p.farm_id, p.medicine, p.dosage, 
             p.status, p.created_at, u.display_name as vet_name, 
             f.farm_name, fr.district, fr.state
      FROM prescriptions p
      LEFT JOIN users u ON p.vet_id = u.user_id
      LEFT JOIN farms f ON p.farm_id = f.farm_id
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      WHERE 1=1
    `;
    const params = [];

    // Role-based filtering
    if (userRole === 'veterinarian') {
      query += ' AND p.vet_id = ?';
      params.push(userId);
    } else if (userRole === 'farmer') {
      query += ' AND f.farmer_id = (SELECT farmer_id FROM farmers WHERE user_id = ?)';
      params.push(userId);
    }
    // Authority can see all prescriptions

    // Status filter
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    // Farm filter
    if (farm_id) {
      query += ' AND p.farm_id = ?';
      params.push(farm_id);
    }

    // Vet filter (for authority/admin)
    if (vet_id && userRole !== 'veterinarian') {
      query += ' AND p.vet_id = ?';
      params.push(vet_id);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [prescriptions] = await db.execute(query, params);

    res.json({
      success: true,
      data: prescriptions,
      count: prescriptions.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({ success: false, message: 'Error fetching prescriptions' });
  }
});

// Get single prescription
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const query = `
      SELECT p.*, u.name as vet_name, f.name as farm_name, d.name as drug_name, 
             d.criticality, d.banned_for_food_animals, m.mrl_value, m.withdrawal_days
      FROM prescriptions p
      LEFT JOIN users u ON p.vet_id = u.id
      LEFT JOIN farms f ON p.farm_id = f.id
      LEFT JOIN drug_master d ON p.drug_id = d.id
      LEFT JOIN mrl_reference m ON m.drug_id = d.id AND m.species = f.species_group
      WHERE p.id = ? AND (p.vet_id = ? OR p.farm_id = ?)
    `;

    const [prescriptions] = await db.promise().query(query, [id, userId, userId]);

    if (prescriptions.length === 0) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    res.json({ success: true, data: prescriptions[0] });
  } catch (error) {
    console.error('Error fetching prescription:', error);
    res.status(500).json({ success: false, message: 'Error fetching prescription' });
  }
});

// Create new prescription
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      farm_id,
      entity_id,
      entity_type,
      drug_id,
      diagnosis,
      dose,
      dose_unit,
      frequency,
      duration,
      duration_unit,
      route,
      notes
    } = req.body;

    const vet_id = req.user.id;
    const userRole = req.user.role;

    // Only veterinarians can create prescriptions
    if (userRole !== 'veterinarian') {
      return res.status(403).json({ success: false, message: 'Only veterinarians can create prescriptions' });
    }

    // Validation
    if (!farm_id || !entity_id || !drug_id || !diagnosis || !dose || !frequency || !duration) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Verify drug exists and get details
    const drugMaster = new DrugMaster();
    const drug = await drugMaster.getById(drug_id);
    if (!drug) {
      return res.status(404).json({ success: false, message: 'Drug not found' });
    }

    // Check if drug is banned
    if (drug.banned_for_food_animals) {
      return res.status(400).json({
        success: false,
        message: 'This drug is banned for food-producing animals'
      });
    }

    // Insert prescription
    const insertQuery = `
      INSERT INTO prescriptions
      (vet_id, farm_id, entity_id, entity_type, drug_id, diagnosis, dose, dose_unit,
       frequency, duration, duration_unit, route, notes, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', NOW())
    `;

    const [result] = await db.promise().query(insertQuery, [
      vet_id, farm_id, entity_id, entity_type, drug_id, diagnosis,
      dose, dose_unit, frequency, duration, duration_unit, route, notes || null
    ]);

    const prescriptionId = result.insertId;

    // Log to blockchain
    const blockchain = new BlockchainService();
    await blockchain.logPrescription({
      prescription_id: prescriptionId,
      vet_id,
      farm_id,
      drug_id,
      entity_id,
      diagnosis
    });

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      data: { id: prescriptionId, status: 'draft', drug: drug }
    });
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({ success: false, message: 'Error creating prescription' });
  }
});

// Update prescription
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      diagnosis,
      dose,
      dose_unit,
      frequency,
      duration,
      duration_unit,
      route,
      notes
    } = req.body;

    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user owns this prescription (vet only)
    const [prescriptions] = await db.promise().query(
      'SELECT * FROM prescriptions WHERE id = ? AND vet_id = ?',
      [id, userId]
    );

    if (prescriptions.length === 0) {
      return res.status(404).json({ success: false, message: 'Prescription not found or not owned by you' });
    }

    // Only allow updates if status is draft or pending_approval
    const status = prescriptions[0].status;
    if (!['draft', 'pending_approval'].includes(status)) {
      return res.status(400).json({ success: false, message: `Cannot update prescription with status: ${status}` });
    }

    const updateQuery = `
      UPDATE prescriptions
      SET diagnosis = ?, dose = ?, dose_unit = ?, frequency = ?, duration = ?,
          duration_unit = ?, route = ?, notes = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await db.promise().query(updateQuery, [
      diagnosis, dose, dose_unit, frequency, duration,
      duration_unit, route, notes || null, id
    ]);

    res.json({ success: true, message: 'Prescription updated successfully' });
  } catch (error) {
    console.error('Error updating prescription:', error);
    res.status(500).json({ success: false, message: 'Error updating prescription' });
  }
});

// Submit and approve prescription (vet approves directly)
router.put('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only vets can submit
    if (userRole !== 'veterinarian') {
      return res.status(403).json({ success: false, message: 'Only veterinarians can submit prescriptions' });
    }

    // Check ownership
    const [prescriptions] = await db.promise().query(
      'SELECT * FROM prescriptions WHERE id = ? AND vet_id = ?',
      [id, userId]
    );

    if (prescriptions.length === 0) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    if (prescriptions[0].status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft prescriptions can be submitted' });
    }

    // Update status to approved directly (no authority approval needed)
    await db.promise().query(
      'UPDATE prescriptions SET status = ?, submitted_at = NOW(), approved_at = NOW() WHERE id = ?',
      ['approved', id]
    );

    res.json({ success: true, message: 'Prescription approved successfully' });
  } catch (error) {
    console.error('Error submitting prescription:', error);
    res.status(500).json({ success: false, message: 'Error submitting prescription' });
  }
});

// Approve prescription (vet can approve directly)
router.put('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only vets and authority can approve
    if (!['veterinarian', 'authority'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Only veterinarians or authority can approve prescriptions' });
    }

    const [prescriptions] = await db.execute(
      'SELECT * FROM prescriptions WHERE prescription_id = ?',
      [id]
    );

    if (prescriptions.length === 0) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    // Vets can only approve their own prescriptions
    if (userRole === 'veterinarian' && prescriptions[0].vet_id !== userId) {
      return res.status(403).json({ success: false, message: 'You can only approve your own prescriptions' });
    }

    // Update status to approved
    await db.execute(
      'UPDATE prescriptions SET status = ?, approved_at = NOW() WHERE prescription_id = ?',
      ['approved', id]
    );

    res.json({ success: true, message: 'Prescription approved successfully' });
  } catch (error) {
    console.error('Error approving prescription:', error);
    res.status(500).json({ success: false, message: 'Error approving prescription' });
  }
});

// Reject prescription
router.put('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userRole = req.user.role;

    if (userRole !== 'authority') {
      return res.status(403).json({ success: false, message: 'Only authority can reject prescriptions' });
    }

    const [prescriptions] = await db.execute(
      'SELECT * FROM prescriptions WHERE prescription_id = ?',
      [id]
    );

    if (prescriptions.length === 0) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    // Update status
    await db.execute(
      'UPDATE prescriptions SET status = ?, rejection_reason = ?, rejected_at = NOW() WHERE prescription_id = ?',
      ['rejected', reason || null, id]
    );

    res.json({ success: true, message: 'Prescription rejected successfully' });
  } catch (error) {
    console.error('Error rejecting prescription:', error);
    res.status(500).json({ success: false, message: 'Error rejecting prescription' });
  }
});

module.exports = router;
