const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const Laboratory = require('../models/Laboratory');
const SampleRequest = require('../models/SampleRequest');
const Notification = require('../models/Notification');
const db = require('../config/database');

// Register or update lab profile (Google login flow is handled in authRoutes; here we store lab details)
router.post('/register', authMiddleware, async (req, res) => {
  try {
    // Only allow users with role 'laboratory' to register/claim lab profile
    if (req.user.role !== 'laboratory') return res.status(403).json({ error: 'Only laboratory users can register a lab profile' });

    const payload = req.body;
    // Expect fields: lab_name, license_number, phone, email, state, district, taluk, address
    const existing = await Laboratory.getByUserId(req.user.user_id);
    if (existing) {
      // Update
      await Laboratory.update(existing.lab_id, payload);
      return res.json({ message: 'Laboratory profile updated', lab: await Laboratory.getById(existing.lab_id) });
    }

    const id = await Laboratory.create({ user_id: req.user.user_id, ...payload });
    const lab = await Laboratory.getById(id);
    res.status(201).json({ message: 'Laboratory registered', lab });
  } catch (e) {
    console.error('Lab register error:', e.message || e);
    res.status(500).json({ error: 'Failed to register lab' });
  }
});

// Get lab profile (or create if doesn't exist)
router.get('/profile', authMiddleware, roleMiddleware(['laboratory']), async (req, res) => {
  try {
    console.log(`Fetching lab profile for user ${req.user.user_id}...`);
    let lab = await Laboratory.getByUserId(req.user.user_id);
    
    // If lab doesn't exist, create one automatically
    if (!lab) {
      console.log(`Creating laboratory profile for user ${req.user.user_id}...`);
      const labId = await Laboratory.create({
        user_id: req.user.user_id,
        lab_name: req.user.display_name || 'Unnamed Lab',
        license_number: `TEMP_${Date.now()}`,
        phone: 'To be updated',
        email: req.user.email,
        state: null,
        district: null,
        taluk: null,
        address: null
      });
      console.log(`✅ Laboratory profile created with ID: ${labId}`);
      lab = await Laboratory.getById(labId);
    }
    
    console.log(`✅ Lab profile fetched:`, lab);
    res.json(lab);
  } catch (e) {
    console.error('Lab profile error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch lab profile', details: e.message });
  }
});

// 🔬 STEP 2: LAB DASHBOARD — PENDING REQUESTS
// Fetch records where lab is assigned AND not collected yet
router.get('/pending-requests', authMiddleware, roleMiddleware(['laboratory']), async (req, res) => {
  try {
    const lab = await Laboratory.getByUserId(req.user.user_id);
    if (!lab) return res.status(404).json({ error: 'Lab profile not found' });
    
    console.log(`📊 Fetching pending requests for Lab ID: ${lab.lab_id}`);
    
    // STEP 2 SQL: Fetch with proper joins
    const query = `
      SELECT sr.sample_request_id, sr.treatment_id, sr.farmer_id, sr.entity_id, sr.safe_date, sr.status,
             sr.created_at, sr.assigned_lab_id,
             a.species, a.tag_id, a.breed,
             f.farm_name, f.address as farm_address, f.district, f.state,
             t.treatment_medicine, t.dosage, t.duration_days, t.end_date
      FROM sample_requests sr
      JOIN animals_or_batches a ON a.entity_id = sr.entity_id
      JOIN farms f ON f.farm_id = a.farm_id
      JOIN treatment_records t ON t.treatment_id = sr.treatment_id
      WHERE sr.assigned_lab_id = ? AND sr.status='requested'
      ORDER BY sr.safe_date ASC
    `;
    
    const [pending] = await db.execute(query, [lab.lab_id]);
    console.log(`✅ Found ${pending.length} pending requests`);
    res.json(pending);
  } catch (e) {
    console.error('Pending requests error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch pending requests', details: e.message });
  }
});

// 🔬 STEP 3: SAMPLE COLLECTION
// Insert into samples table and update sample_request status to 'collected'
router.post('/collect-sample', authMiddleware, roleMiddleware(['laboratory']), async (req, res) => {
  try {
    const { sample_request_id, sample_type, collected_date, remarks } = req.body;
    
    if (!sample_request_id || !sample_type || !collected_date) {
      return res.status(400).json({ error: 'Missing required fields: sample_request_id, sample_type, collected_date' });
    }
    
    const lab = await Laboratory.getByUserId(req.user.user_id);
    if (!lab) return res.status(404).json({ error: 'Lab profile not found' });

    console.log(`🧪 Collecting sample for request ID: ${sample_request_id} at Lab: ${lab.lab_id}`);

    const sr = await SampleRequest.getById(sample_request_id);
    if (!sr) return res.status(404).json({ error: 'Sample request not found' });
    if (sr.assigned_lab_id !== lab.lab_id) return res.status(403).json({ error: 'Not assigned to this lab' });

    // STEP 3 SQL: Insert into samples table
    const query = `INSERT INTO samples (sample_request_id, sample_type, collected_date, collected_by_lab_id, remarks) VALUES (?, ?, ?, ?, ?)`;
    const [r] = await db.execute(query, [sample_request_id, sample_type, collected_date, lab.lab_id, remarks]);
    console.log(`✅ Sample inserted with ID: ${r.insertId}`);

    // STEP 3 SQL: Update sample_request status to 'collected'
    await SampleRequest.updateStatus(sample_request_id, 'collected');
    console.log(`✅ Sample request status updated to 'collected'`);

    // Notify farmer that sample was collected
    const Notification = require('../models/Notification');
    await Notification.create({ 
      user_id: sr.farmer_id, 
      type: 'info', 
      subtype: 'sample_collected', 
      message: `Sample collected for entity ${sr.entity_id}`, 
      entity_id: sr.entity_id, 
      treatment_id: sr.treatment_id 
    });
    console.log(`📧 Notification sent to farmer: ${sr.farmer_id}`);

    res.status(201).json({ message: 'Sample collected', sample_id: r.insertId });
  } catch (e) {
    console.error('Collect sample error:', e.message || e);
    res.status(500).json({ error: 'Failed to collect sample', details: e.message });
  }
});

// 🔬 STEP 4: REPORT SUBMISSION
// Insert into lab_test_reports and update sample_request status to 'tested'
router.post('/upload-report', authMiddleware, roleMiddleware(['laboratory']), async (req, res) => {
  try {
    const { sample_id, detected_residue, mrl_limit, withdrawal_days_remaining, final_status, tested_on, remarks, certificate_url } = req.body;
    
    if (!sample_id || !detected_residue || !final_status || !tested_on) {
      return res.status(400).json({ error: 'Missing required fields: sample_id, detected_residue, final_status, tested_on' });
    }
    
    const lab = await Laboratory.getByUserId(req.user.user_id);
    if (!lab) return res.status(404).json({ error: 'Lab profile not found' });

    console.log(`📋 Uploading lab report for sample ID: ${sample_id} from Lab: ${lab.lab_id}`);

    // Validate sample exists
    const [sRows] = await db.execute('SELECT * FROM samples WHERE sample_id = ?', [sample_id]);
    if (!sRows || sRows.length === 0) return res.status(404).json({ error: 'Sample not found' });
    const sample = sRows[0];
    console.log(`✅ Sample found: ${sample_id}`);

    // STEP 4 SQL: Insert into lab_test_reports table
    const q = `INSERT INTO lab_test_reports (sample_id, lab_id, detected_residue, mrl_limit, withdrawal_days_remaining, final_status, tested_on, remarks, certificate_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const [r] = await db.execute(q, [sample_id, lab.lab_id, detected_residue, mrl_limit, withdrawal_days_remaining, final_status, tested_on, remarks, certificate_url]);
    console.log(`✅ Lab report inserted with ID: ${r.insertId}`);

    // STEP 4 SQL: Update sample_request status to 'tested'
    await SampleRequest.updateStatus(sample.sample_request_id, 'tested');
    console.log(`✅ Sample request status updated to 'tested'`);

    // If final_status is unsafe, create alert notification for authority
    const Notification = require('../models/Notification');
    if (final_status === 'unsafe') {
      await Notification.create({ 
        user_id: null, 
        type: 'alert', 
        subtype: 'unsafe_lab_report', 
        message: `⚠️ UNSAFE: Residue ${detected_residue} exceeds MRL ${mrl_limit} for sample ${sample_id}`, 
        entity_id: sample.entity_id 
      });
      console.log(`🚨 Alert notification created for unsafe residue`);
    } else {
      // If safe, notify farmer about safe withdrawal date
      const [srRows] = await db.execute('SELECT farmer_id FROM sample_requests WHERE sample_request_id = ?', [sample.sample_request_id]);
      if (srRows && srRows.length > 0) {
        await Notification.create({
          user_id: srRows[0].farmer_id,
          type: 'success',
          subtype: 'test_completed_safe',
          message: `✅ Test passed! Safe to use products after ${new Date(tested_on).toLocaleDateString()}. Withdrawal: ${withdrawal_days_remaining} days.`,
          entity_id: sample.entity_id,
          treatment_id: sample.sample_request_id
        });
        console.log(`📧 Safe withdrawal notification sent to farmer`);
      }
    }

    res.status(201).json({ message: 'Report uploaded', report_id: r.insertId });
  } catch (e) {
    console.error('Upload report error:', e.message || e);
    res.status(500).json({ error: 'Failed to upload report', details: e.message });
  }
});

// Get all incoming treatment cases (treatments with withdrawal predictions)
router.get('/incoming-cases', authMiddleware, roleMiddleware(['laboratory']), async (req, res) => {
  try {
    const [cases] = await db.execute(`
      SELECT ar.amu_id, tr.treatment_id, tr.entity_id, tr.user_id as farmer_id,
             ar.safe_date, tr.treatment_medicine, 
             f.farm_name, f.address
      FROM amu_records ar
      JOIN treatment_records tr ON ar.treatment_id = tr.treatment_id
      JOIN farms f ON f.farm_id = tr.farm_id
      WHERE ar.safe_date IS NOT NULL
      AND tr.treatment_id NOT IN (
        SELECT DISTINCT treatment_id FROM sample_requests
      )
      ORDER BY ar.safe_date ASC
    `);
    res.json(cases);
  } catch (e) {
    console.error('Incoming cases error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch incoming cases' });
  }
});

// Assign treatment to this lab
router.post('/assign-treatment', authMiddleware, roleMiddleware(['laboratory']), async (req, res) => {
  try {
    const { treatment_id, entity_id, farmer_id, safe_date } = req.body;
    const lab = await Laboratory.getByUserId(req.user.user_id);
    if (!lab) return res.status(404).json({ error: 'Lab profile not found' });

    // Create sample request
    const sampleRequestId = await SampleRequest.create({
      treatment_id,
      farmer_id,
      entity_id,
      assigned_lab_id: lab.lab_id,
      safe_date,
      status: 'requested'
    });

    // Notify farmer
    await Notification.create({
      user_id: farmer_id,
      type: 'alert',
      message: `Lab assigned for sample collection. Safe date: ${safe_date}`,
      entity_id,
      treatment_id
    });

    res.json({ message: 'Treatment assigned', sample_request_id: sampleRequestId });
  } catch (e) {
    console.error('Assign treatment error:', e.message || e);
    res.status(500).json({ error: 'Failed to assign treatment' });
  }
});

// Get sample requests for this lab
router.get('/sample-requests', authMiddleware, roleMiddleware(['laboratory']), async (req, res) => {
  try {
    const lab = await Laboratory.getByUserId(req.user.user_id);
    if (!lab) return res.status(404).json({ error: 'Lab profile not found' });

    const [requests] = await db.execute(`
      SELECT sr.sample_request_id, sr.entity_id, sr.safe_date, sr.status,
             a.species, f.farm_name
      FROM sample_requests sr
      JOIN animals_or_batches a ON a.entity_id = sr.entity_id
      JOIN farms f ON f.farm_id = a.farm_id
      WHERE sr.assigned_lab_id = ?
      ORDER BY sr.created_at DESC
    `, [lab.lab_id]);

    res.json(requests);
  } catch (e) {
    console.error('Sample requests error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch sample requests' });
  }
});

// Get pending samples ready for collection (approved status)
router.get('/pending-samples', authMiddleware, roleMiddleware(['laboratory']), async (req, res) => {
  try {
    const lab = await Laboratory.getByUserId(req.user.user_id);
    if (!lab) return res.status(404).json({ error: 'Lab profile not found' });

    const [samples] = await db.execute(`
      SELECT sr.sample_request_id, sr.entity_id, sr.safe_date,
             a.species, f.farm_name
      FROM sample_requests sr
      JOIN animals_or_batches a ON a.entity_id = sr.entity_id
      JOIN farms f ON f.farm_id = a.farm_id
      WHERE sr.assigned_lab_id = ? 
      AND sr.status IN ('approved')
      AND sr.safe_date <= CURDATE()
      ORDER BY sr.safe_date ASC
    `, [lab.lab_id]);

    res.json(samples);
  } catch (e) {
    console.error('Pending samples error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch pending samples' });
  }
});

// Get untested samples (collected but not yet tested)
router.get('/untested-samples', authMiddleware, roleMiddleware(['laboratory']), async (req, res) => {
  try {
    const lab = await Laboratory.getByUserId(req.user.user_id);
    if (!lab) return res.status(404).json({ error: 'Lab profile not found' });

    const [samples] = await db.execute(`
      SELECT s.sample_id, s.sample_type, s.collected_date,
             sr.entity_id
      FROM samples s
      JOIN sample_requests sr ON sr.sample_request_id = s.sample_request_id
      WHERE sr.assigned_lab_id = ?
      AND sr.status = 'collected'
      AND s.sample_id NOT IN (
        SELECT DISTINCT sample_id FROM lab_test_reports
      )
      ORDER BY s.collected_date ASC
    `, [lab.lab_id]);

    res.json(samples);
  } catch (e) {
    console.error('Untested samples error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch untested samples' });
  }
});

// Get all reports for this lab
router.get('/all-reports', authMiddleware, roleMiddleware(['laboratory']), async (req, res) => {
  try {
    const lab = await Laboratory.getByUserId(req.user.user_id);
    if (!lab) return res.status(404).json({ error: 'Lab profile not found' });

    const [reports] = await db.execute(`
      SELECT ltr.report_id, ltr.detected_residue, ltr.mrl_limit, 
             ltr.withdrawal_days_remaining, ltr.final_status, ltr.tested_on,
             ltr.remarks, ltr.certificate_url,
             s.sample_type, sr.entity_id, f.farm_name
      FROM lab_test_reports ltr
      JOIN samples s ON s.sample_id = ltr.sample_id
      JOIN sample_requests sr ON sr.sample_request_id = s.sample_request_id
      JOIN animals_or_batches a ON a.entity_id = sr.entity_id
      JOIN farms f ON f.farm_id = a.farm_id
      WHERE ltr.lab_id = ?
      ORDER BY ltr.tested_on DESC
    `, [lab.lab_id]);

    res.json(reports);
  } catch (e) {
    console.error('All reports error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get lab statistics
router.get('/stats', authMiddleware, roleMiddleware(['laboratory']), async (req, res) => {
  try {
    const lab = await Laboratory.getByUserId(req.user.user_id);
    if (!lab) return res.status(404).json({ error: 'Lab profile not found' });

    const [pending] = await db.execute(
      'SELECT COUNT(*) as count FROM sample_requests WHERE assigned_lab_id = ? AND status = ?',
      [lab.lab_id, 'requested']
    );

    const [collected] = await db.execute(
      'SELECT COUNT(*) as count FROM samples WHERE collected_by_lab_id = ?',
      [lab.lab_id]
    );

    const [tested] = await db.execute(
      'SELECT COUNT(*) as count FROM lab_test_reports WHERE lab_id = ?',
      [lab.lab_id]
    );

    res.json({
      pending: pending[0]?.count || 0,
      collected: collected[0]?.count || 0,
      tested: tested[0]?.count || 0,
      completed: tested[0]?.count || 0
    });
  } catch (e) {
    console.error('Stats error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Update lab profile
router.put('/profile', authMiddleware, roleMiddleware(['laboratory']), async (req, res) => {
  try {
    console.log(`=== START: Updating lab profile for user ${req.user.user_id} ===`);
    console.log(`Received raw request body:`, JSON.stringify(req.body, null, 2));
    
    const lab = await Laboratory.getByUserId(req.user.user_id);
    if (!lab) {
      console.error(`Lab not found for user ${req.user.user_id}`);
      return res.status(404).json({ error: 'Lab profile not found' });
    }

    console.log(`Found lab with lab_id: ${lab.lab_id}`);
    
    // Filter out empty values and prepare update data
    const updateData = {};
    const allowedFields = ['lab_name', 'license_number', 'phone', 'email', 'state', 'district', 'taluk', 'address'];
    
    for (const field of allowedFields) {
      if (req.body.hasOwnProperty(field)) {
        // Convert empty strings to null for optional fields
        const value = req.body[field] === '' ? null : req.body[field];
        updateData[field] = value;
        console.log(`  ${field}: "${req.body[field]}" → ${value}`);
      }
    }
    
    console.log(`Update data to be saved:`, JSON.stringify(updateData, null, 2));
    
    if (Object.keys(updateData).length === 0) {
      console.warn('No fields to update - empty request');
      const current = await Laboratory.getById(lab.lab_id);
      return res.json({ message: 'No changes made', lab: current });
    }

    const affectedRows = await Laboratory.update(lab.lab_id, updateData);
    console.log(`Database update result: ${affectedRows} rows affected`);
    
    const updated = await Laboratory.getById(lab.lab_id);
    console.log(`✅ Lab profile updated successfully`);
    console.log(`Updated data:`, JSON.stringify(updated, null, 2));
    console.log(`=== END: Update completed ===\n`);
    
    res.json({ message: 'Profile updated', lab: updated });
  } catch (e) {
    console.error('❌ Profile update error:', e.message);
    console.error('Stack trace:', e.stack);
    console.error('=== END: Update failed ===\n');
    res.status(500).json({ error: 'Failed to update profile', details: e.message });
  }
});

module.exports = router;
