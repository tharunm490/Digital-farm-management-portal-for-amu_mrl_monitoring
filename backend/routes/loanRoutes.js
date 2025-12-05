const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { Farmer } = require('../models/User');
const Farm = require('../models/Farm');

// ============================================
// FARMER ENDPOINTS
// ============================================

// Get farmer's farms for dropdown
router.get('/farmer/farms', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ error: 'Access denied. Farmer role required.' });
    }

    // Use the same approach as farmRoutes
    const farmer = await Farmer.getByUserId(req.user.user_id);

    if (!farmer) {
      console.log('No farmer profile found for user_id:', req.user.user_id);
      return res.status(404).json({ error: 'Farmer profile not found' });
    }

    console.log('Found farmer:', farmer.farmer_id, 'for user_id:', req.user.user_id);

    const farms = await Farm.getByFarmerId(farmer.farmer_id);
    console.log('Found farms:', farms.length);

    res.json(farms);
  } catch (error) {
    console.error('Error fetching farmer farms:', error);
    res.status(500).json({ error: 'Failed to fetch farms' });
  }
});

// Apply for loan (Farmer)
router.post('/apply', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ error: 'Access denied. Farmer role required.' });
    }

    const { farm_id, purpose, amount_requested, description } = req.body;

    // Validate required fields
    if (!farm_id || !purpose || !amount_requested) {
      return res.status(400).json({ error: 'Farm, purpose, and amount are required' });
    }

    // Validate purpose enum
    const validPurposes = ['animal_purchase', 'feed_nutrition', 'farm_infrastructure'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({ error: 'Invalid loan purpose' });
    }

    // Validate amount
    if (amount_requested <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Get farmer using the model
    const farmer = await Farmer.getByUserId(req.user.user_id);

    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }

    const farmerId = farmer.farmer_id;

    // Verify the farm belongs to this farmer
    const [farms] = await db.query(
      'SELECT farm_id FROM farms WHERE farm_id = ? AND farmer_id = ?',
      [farm_id, farmerId]
    );

    if (farms.length === 0) {
      return res.status(403).json({ error: 'Farm does not belong to this farmer' });
    }

    // Insert loan request
    const [result] = await db.execute(
      `INSERT INTO loan_requests (farmer_id, farm_id, purpose, amount_requested, description, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [farmerId, farm_id, purpose, amount_requested, description || null]
    );

    res.status(201).json({
      message: 'Your loan request has been submitted and is under review by the authority.',
      loan_id: result.insertId
    });
  } catch (error) {
    console.error('Error applying for loan:', error);
    res.status(500).json({ error: 'Failed to submit loan application' });
  }
});

// Get loan status (Farmer) - includes action details for approved/rejected loans
router.get('/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ error: 'Access denied. Farmer role required.' });
    }

    // Get farmer using the model
    const farmer = await Farmer.getByUserId(req.user.user_id);

    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }

    const farmerId = farmer.farmer_id;

    const [loans] = await db.query(
      `SELECT lr.loan_id,
              lr.purpose,
              lr.amount_requested,
              lr.status,
              lr.description,
              lr.created_at,
              lr.action_date,
              lr.authority_department,
              lr.authority_designation,
              f.farm_name,
              au.display_name AS action_by_name
       FROM loan_requests lr
       JOIN farms f ON lr.farm_id = f.farm_id
       LEFT JOIN users au ON lr.action_by = au.user_id
       WHERE lr.farmer_id = ?
       ORDER BY lr.created_at DESC`,
      [farmerId]
    );

    res.json(loans);
  } catch (error) {
    console.error('Error fetching loan status:', error);
    res.status(500).json({ error: 'Failed to fetch loan status' });
  }
});

// ============================================
// AUTHORITY ENDPOINTS
// ============================================

// Middleware to check authority role
const authorityMiddleware = (req, res, next) => {
  if (req.user.role !== 'authority') {
    return res.status(403).json({ error: 'Access denied. Authority role required.' });
  }
  next();
};

// Get all loan applications (Authority) - Global visibility for all authorities
router.get('/applications', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const [loans] = await db.query(
      `SELECT lr.loan_id,
              lr.farmer_id,
              lr.farm_id,
              lr.purpose,
              lr.amount_requested,
              lr.status,
              lr.created_at,
              lr.action_by,
              lr.action_date,
              lr.authority_department,
              lr.authority_designation,
              f.farm_name,
              u.state,
              u.district,
              u.taluk,
              u.display_name AS farmer_name,
              au.display_name AS action_by_name
       FROM loan_requests lr
       JOIN farms f ON lr.farm_id = f.farm_id
       JOIN farmers fm ON lr.farmer_id = fm.farmer_id
       JOIN users u ON fm.user_id = u.user_id
       LEFT JOIN users au ON lr.action_by = au.user_id
       ORDER BY lr.created_at DESC`
    );

    res.json(loans);
  } catch (error) {
    console.error('Error fetching loan applications:', error);
    res.status(500).json({ error: 'Failed to fetch loan applications' });
  }
});

// Get loan detail (Authority)
router.get('/applications/:loanId', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const { loanId } = req.params;

    // Get loan and farmer/farm info with action details
    const [loanInfo] = await db.query(
      `SELECT lr.loan_id,
              lr.purpose,
              lr.amount_requested,
              lr.status,
              lr.description,
              lr.created_at,
              lr.farm_id,
              lr.action_by,
              lr.action_date,
              lr.authority_department,
              lr.authority_designation,
              u.display_name AS farmer_name,
              u.phone,
              u.state,
              u.district,
              u.taluk,
              f.farm_name,
              au.display_name AS action_by_name
       FROM loan_requests lr
       JOIN farmers fm ON lr.farmer_id = fm.farmer_id
       JOIN users u ON fm.user_id = u.user_id
       JOIN farms f ON lr.farm_id = f.farm_id
       LEFT JOIN users au ON lr.action_by = au.user_id
       WHERE lr.loan_id = ?`,
      [loanId]
    );

    if (loanInfo.length === 0) {
      return res.status(404).json({ error: 'Loan application not found' });
    }

    const loan = loanInfo[0];
    const farmId = loan.farm_id;

    // Get species-wise animal count
    const [animalCounts] = await db.query(
      `SELECT species, COUNT(*) AS animal_count
       FROM animals_or_batches
       WHERE farm_id = ?
       GROUP BY species`,
      [farmId]
    );

    // Get total treatments
    const [treatmentCount] = await db.query(
      `SELECT COUNT(*) AS total_treatments
       FROM treatment_records
       WHERE farm_id = ?`,
      [farmId]
    );

    // Get medicines used
    const [medicines] = await db.query(
      `SELECT DISTINCT medicine
       FROM amu_records
       WHERE farm_id = ?`,
      [farmId]
    );

    // Get risk category counts
    const [riskCounts] = await db.query(
      `SELECT risk_category, COUNT(*) AS count
       FROM amu_records
       WHERE farm_id = ?
       GROUP BY risk_category`,
      [farmId]
    );

    // Format risk summary
    const riskSummary = {
      safe: 0,
      borderline: 0,
      unsafe: 0
    };
    riskCounts.forEach(r => {
      if (r.risk_category) {
        riskSummary[r.risk_category.toLowerCase()] = r.count;
      }
    });

    // Get violations count (MRL violations - tissue results that exceed limits)
    const [violationsCount] = await db.query(
      `SELECT COUNT(DISTINCT amu_id) AS total_violations
       FROM amu_tissue_results
       WHERE amu_id IN (SELECT amu_id FROM amu_records WHERE farm_id = ?)
       AND risk_category = 'UNSAFE'`,
      [farmId]
    );

    // Get loan history (audit trail)
    const [history] = await db.query(
      `SELECT lrh.history_id,
              lrh.action,
              lrh.remarks,
              lrh.action_date,
              lrh.department,
              lrh.designation,
              u.display_name AS action_by_name
       FROM loan_request_history lrh
       JOIN users u ON lrh.action_by = u.user_id
       WHERE lrh.loan_id = ?
       ORDER BY lrh.action_date ASC`,
      [loanId]
    );

    res.json({
      loan,
      livestock: animalCounts,
      treatmentSummary: {
        totalTreatments: treatmentCount[0].total_treatments,
        medicinesUsed: medicines.map(m => m.medicine),
        riskSummary,
        totalAmuRecords: riskSummary.safe + riskSummary.borderline + riskSummary.unsafe,
        violations: violationsCount[0].total_violations || 0
      },
      history
    });
  } catch (error) {
    console.error('Error fetching loan detail:', error);
    res.status(500).json({ error: 'Failed to fetch loan details' });
  }
});

// Update loan status (Authority - Approve/Reject) with audit trail
router.patch('/applications/:loanId/status', authMiddleware, authorityMiddleware, async (req, res) => {
  try {
    const { loanId } = req.params;
    const { status, remarks } = req.body;

    // Validate status
    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved or rejected.' });
    }

    // Check if loan exists and is still pending
    const [existing] = await db.query(
      'SELECT loan_id, status FROM loan_requests WHERE loan_id = ?',
      [loanId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Loan application not found' });
    }

    if (existing[0].status !== 'pending') {
      return res.status(400).json({ 
        error: 'This loan application has already been processed.',
        currentStatus: existing[0].status
      });
    }

    // Get authority profile details
    const [authorityProfile] = await db.query(
      `SELECT department, designation 
       FROM authority_profiles 
       WHERE user_id = ?`,
      [req.user.user_id]
    );

    const department = authorityProfile.length > 0 ? authorityProfile[0].department : null;
    const designation = authorityProfile.length > 0 ? authorityProfile[0].designation : null;

    // Update status with audit trail in loan_requests table
    await db.execute(
      `UPDATE loan_requests 
       SET status = ?, 
           action_by = ?, 
           action_date = NOW(), 
           authority_department = ?, 
           authority_designation = ?
       WHERE loan_id = ?`,
      [status, req.user.user_id, department, designation, loanId]
    );

    // Insert into loan_request_history for permanent audit trail
    await db.execute(
      `INSERT INTO loan_request_history 
       (loan_id, action_by, action, remarks, department, designation)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [loanId, req.user.user_id, status, remarks || null, department, designation]
    );

    res.json({
      message: `Loan application has been ${status}`,
      status,
      action_by: req.user.user_id,
      action_date: new Date().toISOString(),
      authority_department: department,
      authority_designation: designation
    });
  } catch (error) {
    console.error('Error updating loan status:', error);
    res.status(500).json({ error: 'Failed to update loan status' });
  }
});

module.exports = router;
