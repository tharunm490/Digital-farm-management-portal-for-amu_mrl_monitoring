const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { Distributor, DistributorVerificationLog } = require('../models/Distributor');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// ======================================================
// CHECK IF DISTRIBUTOR PROFILE IS COMPLETE
// ======================================================
router.get('/profile/status', authMiddleware, roleMiddleware(['distributor']), async (req, res) => {
  try {
    const distributor = await Distributor.getByUserId(req.user.user_id);
    
    if (!distributor) {
      return res.json({ profile_complete: false, reason: 'no_profile' });
    }
    
    // Check if required fields are filled
    const isComplete = distributor.distributor_name && 
                       distributor.company_name && 
                       distributor.company_name !== 'To be updated' &&
                       distributor.phone && 
                       distributor.phone !== 'To be updated';
    
    res.json({ 
      profile_complete: isComplete, 
      reason: isComplete ? null : 'incomplete_profile',
      distributor 
    });
  } catch (err) {
    console.error('Profile status error:', err);
    res.status(500).json({ error: 'Failed to check profile status' });
  }
});

// ======================================================
// GET DISTRIBUTOR PROFILE
// ======================================================
router.get('/profile', authMiddleware, roleMiddleware(['distributor']), async (req, res) => {
  try {
    const distributor = await Distributor.getByUserId(req.user.user_id);
    
    if (!distributor) {
      return res.status(404).json({ error: 'Distributor profile not found' });
    }
    
    res.json(distributor);
  } catch (err) {
    console.error('Get distributor profile error:', err);
    res.status(500).json({ error: 'Failed to fetch distributor profile' });
  }
});

// ======================================================
// UPDATE DISTRIBUTOR PROFILE
// ======================================================
router.put('/profile', authMiddleware, roleMiddleware(['distributor']), async (req, res) => {
  try {
    const { 
      distributor_name, company_name, license_number, 
      phone, email, address, state, district, taluk, gst_number 
    } = req.body;
    
    // Validate required fields
    if (!distributor_name || !company_name || !phone) {
      return res.status(400).json({ error: 'Distributor name, company name, and phone are required' });
    }
    
    // Check if distributor profile exists
    let distributor = await Distributor.getByUserId(req.user.user_id);
    
    if (distributor) {
      await Distributor.update(req.user.user_id, {
        distributor_name, company_name, license_number,
        phone, email, address, state, district, taluk, gst_number
      });
    } else {
      await Distributor.create({
        user_id: req.user.user_id,
        distributor_name, company_name, license_number,
        phone, email, address, state, district, taluk, gst_number
      });
    }
    
    const updatedDistributor = await Distributor.getByUserId(req.user.user_id);
    res.json({ message: 'Profile updated successfully', distributor: updatedDistributor });
  } catch (err) {
    console.error('Update distributor profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ======================================================
// GET PRODUCT INFO BY QR HASH (PUBLIC - but login required to verify)
// This is the core QR verification endpoint
// ======================================================
router.get('/verify-product/:qr_hash', async (req, res) => {
  try {
    const { qr_hash } = req.params;
    
    if (!qr_hash) {
      return res.status(400).json({ error: 'QR hash is required' });
    }
    
    // Find QR record by hash (qr_code column stores the hash)
    const [qrRecords] = await db.query(`
      SELECT q.qr_id, q.entity_id, q.qr_code, q.created_at as qr_created_at,
             e.tag_number, e.species, e.breed, e.entity_type, e.farm_id,
             f.farm_name, f.location as farm_location,
             u.display_name as farmer_name, u.state, u.district, u.taluk
      FROM qr_records q
      JOIN animals_or_batches e ON q.entity_id = e.entity_id
      JOIN farms f ON e.farm_id = f.farm_id
      JOIN users u ON f.user_id = u.user_id
      WHERE q.qr_code = ?
    `, [qr_hash]);
    
    if (qrRecords.length === 0) {
      return res.status(404).json({ error: 'Product not found. Invalid QR code.' });
    }
    
    const qrRecord = qrRecords[0];
    
    // Get latest AMU record and withdrawal status
    const [amuRecords] = await db.query(`
      SELECT a.amu_id, a.medicine_name, a.dosage, a.treatment_date, a.safe_date,
             a.withdrawal_period_days, a.is_safe_now,
             CASE WHEN a.safe_date <= CURDATE() THEN 1 ELSE 0 END as is_withdrawal_safe
      FROM amu_records a
      WHERE a.entity_id = ?
      ORDER BY a.safe_date DESC
      LIMIT 1
    `, [qrRecord.entity_id]);
    
    let withdrawalStatus = {
      is_safe: true,
      safe_date: null,
      last_treatment: null,
      days_remaining: 0
    };
    
    if (amuRecords.length > 0) {
      const latestAmu = amuRecords[0];
      const safeDate = new Date(latestAmu.safe_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      safeDate.setHours(0, 0, 0, 0);
      
      const isSafe = safeDate <= today;
      const daysRemaining = isSafe ? 0 : Math.ceil((safeDate - today) / (1000 * 60 * 60 * 24));
      
      withdrawalStatus = {
        is_safe: isSafe,
        safe_date: latestAmu.safe_date,
        last_treatment: latestAmu.treatment_date,
        medicine_name: latestAmu.medicine_name,
        days_remaining: daysRemaining
      };
    }
    
    // Get all recent treatments for transparency
    const [treatments] = await db.query(`
      SELECT t.treatment_id, t.treatment_date, t.medicine_name, t.dosage,
             t.withdrawal_period, t.route, t.diagnosis
      FROM treatments t
      WHERE t.entity_id = ?
      ORDER BY t.treatment_date DESC
      LIMIT 5
    `, [qrRecord.entity_id]);
    
    res.json({
      qr_id: qrRecord.qr_id,
      entity_id: qrRecord.entity_id,
      product_info: {
        tag_number: qrRecord.tag_number,
        species: qrRecord.species,
        breed: qrRecord.breed,
        entity_type: qrRecord.entity_type
      },
      farm_info: {
        farm_name: qrRecord.farm_name,
        farmer_name: qrRecord.farmer_name,
        location: `${qrRecord.taluk || ''}, ${qrRecord.district || ''}, ${qrRecord.state || ''}`.replace(/^, |, $/g, '')
      },
      withdrawal_status: withdrawalStatus,
      recent_treatments: treatments,
      qr_generated_at: qrRecord.qr_created_at
    });
    
  } catch (err) {
    console.error('Verify product error:', err);
    res.status(500).json({ error: 'Failed to verify product' });
  }
});

// ======================================================
// SUBMIT VERIFICATION DECISION (ACCEPT/REJECT)
// Requires distributor login
// ======================================================
router.post('/verify-product', authMiddleware, roleMiddleware(['distributor']), async (req, res) => {
  try {
    const { qr_id, entity_id, verification_status, reason } = req.body;
    
    // Validate required fields
    if (!qr_id || !entity_id || !verification_status) {
      return res.status(400).json({ error: 'QR ID, Entity ID, and verification status are required' });
    }
    
    if (!['accepted', 'rejected'].includes(verification_status)) {
      return res.status(400).json({ error: 'Invalid verification status. Must be "accepted" or "rejected"' });
    }
    
    // Get distributor
    const distributor = await Distributor.getByUserId(req.user.user_id);
    if (!distributor) {
      return res.status(404).json({ error: 'Distributor profile not found. Please complete your profile first.' });
    }
    
    // Check if this distributor has already verified this QR
    const [existingLogs] = await db.query(`
      SELECT log_id, verification_status, scanned_at 
      FROM distributor_verification_logs 
      WHERE distributor_id = ? AND qr_id = ?
    `, [distributor.distributor_id, qr_id]);
    
    if (existingLogs.length > 0) {
      return res.status(400).json({ 
        error: 'You have already verified this product.',
        previous_verification: existingLogs[0]
      });
    }
    
    // Get current withdrawal status
    const [amuRecords] = await db.query(`
      SELECT safe_date,
             CASE WHEN safe_date <= CURDATE() THEN 1 ELSE 0 END as is_withdrawal_safe
      FROM amu_records
      WHERE entity_id = ?
      ORDER BY safe_date DESC
      LIMIT 1
    `, [entity_id]);
    
    let is_withdrawal_safe = true;
    let safe_date = null;
    
    if (amuRecords.length > 0) {
      is_withdrawal_safe = amuRecords[0].is_withdrawal_safe === 1;
      safe_date = amuRecords[0].safe_date;
    }
    
    // Create verification log
    const logId = await DistributorVerificationLog.create({
      distributor_id: distributor.distributor_id,
      qr_id,
      entity_id,
      verification_status,
      is_withdrawal_safe: is_withdrawal_safe ? 1 : 0,
      safe_date,
      reason: reason || null
    });
    
    const log = await DistributorVerificationLog.getById(logId);
    
    res.status(201).json({ 
      message: `Product ${verification_status} successfully`,
      log,
      warning: !is_withdrawal_safe ? 'WARNING: Product is within withdrawal period!' : null
    });
    
  } catch (err) {
    console.error('Submit verification error:', err);
    res.status(500).json({ error: 'Failed to submit verification' });
  }
});

// ======================================================
// CHECK IF ALREADY VERIFIED BY THIS DISTRIBUTOR
// ======================================================
router.get('/check-verification/:qr_id', authMiddleware, roleMiddleware(['distributor']), async (req, res) => {
  try {
    const { qr_id } = req.params;
    
    const distributor = await Distributor.getByUserId(req.user.user_id);
    if (!distributor) {
      return res.json({ verified: false, has_profile: false });
    }
    
    const [logs] = await db.query(`
      SELECT log_id, verification_status, scanned_at, reason
      FROM distributor_verification_logs 
      WHERE distributor_id = ? AND qr_id = ?
    `, [distributor.distributor_id, qr_id]);
    
    if (logs.length > 0) {
      return res.json({ 
        verified: true, 
        has_profile: true,
        previous_verification: logs[0]
      });
    }
    
    res.json({ verified: false, has_profile: true });
    
  } catch (err) {
    console.error('Check verification error:', err);
    res.status(500).json({ error: 'Failed to check verification status' });
  }
});

// ======================================================
// GET VERIFICATION HISTORY
// ======================================================
router.get('/verifications', authMiddleware, roleMiddleware(['distributor']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const distributor = await Distributor.getByUserId(req.user.user_id);
    if (!distributor) {
      return res.status(404).json({ error: 'Distributor profile not found' });
    }
    
    const logs = await DistributorVerificationLog.getByDistributorId(distributor.distributor_id, limit);
    res.json(logs);
  } catch (err) {
    console.error('Get verifications error:', err);
    res.status(500).json({ error: 'Failed to fetch verifications' });
  }
});

// ======================================================
// GET DISTRIBUTOR DASHBOARD STATS
// ======================================================
router.get('/stats', authMiddleware, roleMiddleware(['distributor']), async (req, res) => {
  try {
    const distributor = await Distributor.getByUserId(req.user.user_id);
    if (!distributor) {
      return res.status(404).json({ error: 'Distributor profile not found' });
    }
    
    const stats = await DistributorVerificationLog.getStats(distributor.distributor_id);
    res.json(stats);
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ======================================================
// AUTHORITY: GET ALL DISTRIBUTORS
// ======================================================
router.get('/all', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const distributors = await Distributor.getAll();
    res.json(distributors);
  } catch (err) {
    console.error('Get all distributors error:', err);
    res.status(500).json({ error: 'Failed to fetch distributors' });
  }
});

// ======================================================
// AUTHORITY: GET ALL RECENT VERIFICATIONS
// ======================================================
router.get('/verifications/all', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await DistributorVerificationLog.getRecent(limit);
    res.json(logs);
  } catch (err) {
    console.error('Get all verifications error:', err);
    res.status(500).json({ error: 'Failed to fetch verifications' });
  }
});

module.exports = router;
