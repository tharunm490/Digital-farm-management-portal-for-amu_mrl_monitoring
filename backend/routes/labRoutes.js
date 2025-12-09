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
             a.species, a.tag_id, a.batch_name,
             f.farm_name, f.district, f.state,
             t.medicine, t.dose_amount, t.duration_days
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
      type: 'alert', 
      subtype: null, 
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
        subtype: 'unsafe_mrl', 
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
          type: 'alert',
          subtype: null,
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

// Get all incoming treatment cases with auto-assigned labs
router.get('/incoming-cases', authMiddleware, roleMiddleware(['laboratory']), async (req, res) => {
  try {
    const [cases] = await db.execute(`
      SELECT ar.amu_id, tr.treatment_id, tr.entity_id, f.farmer_id,
             ar.safe_date, tr.medicine, 
             f.farm_name, f.district, f.state, f.latitude as farm_lat, f.longitude as farm_lon
      FROM amu_records ar
      JOIN treatment_records tr ON ar.treatment_id = tr.treatment_id
      JOIN farms f ON f.farm_id = tr.farm_id
      WHERE ar.safe_date IS NOT NULL
      AND tr.treatment_id NOT IN (
        SELECT DISTINCT treatment_id FROM sample_requests
      )
      ORDER BY ar.safe_date ASC
    `);

    // For each case, determine which lab it should be assigned to
    const casesWithAssignedLabs = await Promise.all(cases.map(async (caseItem) => {
      let assignedLabId = null;
      let assignedLabName = 'Not Assigned';
      let assignmentMethod = 'Pending';
      let distance = null;

      // Step 1: Try distance-based assignment if coordinates available
      if (caseItem.farm_lat && caseItem.farm_lon) {
        const [labs] = await db.execute(`
          SELECT lab_id, lab_name, latitude, longitude, district, state
          FROM laboratories
          WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        `);

        if (labs.length > 0) {
          const labsWithDistance = labs.map(lab => ({
            ...lab,
            distance: calculateDistance(caseItem.farm_lat, caseItem.farm_lon, lab.latitude, lab.longitude)
          }));

          labsWithDistance.sort((a, b) => a.distance - b.distance);
          const nearestLab = labsWithDistance[0];

          if (nearestLab.distance <= 200) {
            assignedLabId = nearestLab.lab_id;
            assignedLabName = nearestLab.lab_name;
            assignmentMethod = 'Nearest Lab';
            distance = nearestLab.distance.toFixed(2);
          }
        }
      }

      // Step 2: Try same district
      if (!assignedLabId) {
        const [districtLabs] = await db.execute(`
          SELECT lab_id, lab_name FROM laboratories
          WHERE district = ? AND state = ?
          LIMIT 1
        `, [caseItem.district, caseItem.state]);

        if (districtLabs.length > 0) {
          assignedLabId = districtLabs[0].lab_id;
          assignedLabName = districtLabs[0].lab_name;
          assignmentMethod = 'Same District';
        }
      }

      // Step 3: Try same state
      if (!assignedLabId) {
        const [stateLabs] = await db.execute(`
          SELECT lab_id, lab_name FROM laboratories
          WHERE state = ?
          LIMIT 1
        `, [caseItem.state]);

        if (stateLabs.length > 0) {
          assignedLabId = stateLabs[0].lab_id;
          assignedLabName = stateLabs[0].lab_name;
          assignmentMethod = 'Same State';
        }
      }

      // Step 4: Default to first available lab
      if (!assignedLabId) {
        const [defaultLab] = await db.execute(`
          SELECT lab_id, lab_name FROM laboratories
          ORDER BY lab_id ASC
          LIMIT 1
        `);

        if (defaultLab.length > 0) {
          assignedLabId = defaultLab[0].lab_id;
          assignedLabName = defaultLab[0].lab_name;
          assignmentMethod = 'Default Lab';
        }
      }

      return {
        ...caseItem,
        assigned_lab_id: assignedLabId,
        assigned_lab_name: assignedLabName,
        assignment_method: assignmentMethod,
        distance_km: distance
      };
    }));

    res.json(casesWithAssignedLabs);
  } catch (e) {
    console.error('Incoming cases error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch incoming cases' });
  }
});

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Assign treatment to this lab (Smart Assignment)
router.post('/assign-treatment', authMiddleware, roleMiddleware(['laboratory']), async (req, res) => {
  try {
    const { treatment_id, entity_id, farmer_id, safe_date } = req.body;
    
    console.log(`🔍 Smart Lab Assignment for Treatment #${treatment_id}`);

    // Get the farm location for this entity
    const [farmRows] = await db.execute(`
      SELECT f.farm_id, f.farm_name, f.latitude, f.longitude, f.district, f.state
      FROM animals_or_batches a
      JOIN farms f ON f.farm_id = a.farm_id
      WHERE a.entity_id = ?
    `, [entity_id]);

    if (!farmRows || farmRows.length === 0) {
      return res.status(404).json({ error: 'Farm not found for this entity' });
    }

    const farm = farmRows[0];
    console.log(`📍 Farm: ${farm.farm_name} (${farm.district}, ${farm.state})`);
    console.log(`   Coordinates: ${farm.latitude}, ${farm.longitude}`);

    let selectedLabId = null;
    let assignmentMethod = '';

    // Step 1: Try to find nearest lab if farm has coordinates
    if (farm.latitude && farm.longitude) {
      const [allLabs] = await db.execute(`
        SELECT lab_id, lab_name, latitude, longitude, district, state
        FROM laboratories
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      `);

      if (allLabs.length > 0) {
        // Calculate distances to all labs
        const labsWithDistance = allLabs.map(lab => ({
          ...lab,
          distance: calculateDistance(farm.latitude, farm.longitude, lab.latitude, lab.longitude)
        }));

        // Sort by distance
        labsWithDistance.sort((a, b) => a.distance - b.distance);

        const nearestLab = labsWithDistance[0];
        const MAX_DISTANCE_KM = 200; // Maximum acceptable distance

        if (nearestLab.distance <= MAX_DISTANCE_KM) {
          selectedLabId = nearestLab.lab_id;
          assignmentMethod = `nearest lab (${nearestLab.distance.toFixed(2)} km away)`;
          console.log(`✅ Nearest Lab: ${nearestLab.lab_name} - ${nearestLab.distance.toFixed(2)} km`);
        } else {
          console.log(`⚠️ Nearest lab is ${nearestLab.distance.toFixed(2)} km away (exceeds ${MAX_DISTANCE_KM} km limit)`);
        }
      }
    }

    // Step 2: Try same district/state
    if (!selectedLabId) {
      const [districtLabs] = await db.execute(`
        SELECT lab_id, lab_name, district, state
        FROM laboratories
        WHERE district = ? AND state = ?
        LIMIT 1
      `, [farm.district, farm.state]);

      if (districtLabs.length > 0) {
        selectedLabId = districtLabs[0].lab_id;
        assignmentMethod = `same district (${farm.district})`;
        console.log(`✅ District Match: ${districtLabs[0].lab_name} in ${farm.district}`);
      }
    }

    // Step 3: Try same state
    if (!selectedLabId) {
      const [stateLabs] = await db.execute(`
        SELECT lab_id, lab_name, state
        FROM laboratories
        WHERE state = ?
        LIMIT 1
      `, [farm.state]);

      if (stateLabs.length > 0) {
        selectedLabId = stateLabs[0].lab_id;
        assignmentMethod = `same state (${farm.state})`;
        console.log(`✅ State Match: ${stateLabs[0].lab_name} in ${farm.state}`);
      }
    }

    // Step 4: Fallback to default lab (lab_id = 1 or any available lab)
    if (!selectedLabId) {
      const [defaultLab] = await db.execute(`
        SELECT lab_id, lab_name
        FROM laboratories
        ORDER BY lab_id ASC
        LIMIT 1
      `);

      if (defaultLab.length > 0) {
        selectedLabId = defaultLab[0].lab_id;
        assignmentMethod = 'default lab (no nearby labs available)';
        console.log(`✅ Default Lab: ${defaultLab[0].lab_name}`);
      } else {
        return res.status(500).json({ error: 'No laboratories available in the system' });
      }
    }

    // Format safe_date to MySQL date format (YYYY-MM-DD)
    const formattedSafeDate = safe_date ? new Date(safe_date).toISOString().split('T')[0] : null;

    // Create sample request with the selected lab
    const sampleRequestId = await SampleRequest.create({
      treatment_id,
      farmer_id,
      entity_id,
      assigned_lab_id: selectedLabId,
      safe_date: formattedSafeDate,
      status: 'requested'
    });

    console.log(`✅ Sample request created: #${sampleRequestId}`);

    // Get lab details for notification
    const [labDetails] = await db.execute('SELECT lab_name FROM laboratories WHERE lab_id = ?', [selectedLabId]);
    const labName = labDetails[0]?.lab_name || 'Laboratory';

    // Notify farmer
    await Notification.create({
      user_id: farmer_id,
      type: 'alert',
      message: `Lab assigned for sample collection: ${labName}. Safe date: ${formattedSafeDate}`,
      entity_id,
      treatment_id
    });

    console.log(`📧 Notification sent to farmer #${farmer_id}`);

    res.json({ 
      message: 'Treatment assigned successfully', 
      sample_request_id: sampleRequestId,
      assigned_lab_id: selectedLabId,
      assignment_method: assignmentMethod,
      lab_name: labName
    });
  } catch (e) {
    console.error('Assign treatment error:', e.message || e);
    res.status(500).json({ error: 'Failed to assign treatment', details: e.message });
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

// Get pending samples ready for collection (approved status OR requested status with safe_date reached)
router.get('/pending-samples', authMiddleware, roleMiddleware(['laboratory']), async (req, res) => {
  try {
    const lab = await Laboratory.getByUserId(req.user.user_id);
    if (!lab) return res.status(404).json({ error: 'Lab profile not found' });

    const [samples] = await db.execute(`
      SELECT sr.sample_request_id, sr.entity_id, sr.safe_date, sr.status,
             a.species, f.farm_name
      FROM sample_requests sr
      JOIN animals_or_batches a ON a.entity_id = sr.entity_id
      JOIN farms f ON f.farm_id = a.farm_id
      WHERE sr.assigned_lab_id = ? 
      AND sr.status IN ('approved', 'requested')
      AND sr.safe_date <= CURDATE()
      AND sr.sample_request_id NOT IN (
        SELECT DISTINCT sample_request_id FROM samples
      )
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
      SELECT ltr.report_id, ltr.final_status, ltr.tested_on,
             ltr.detected_residue, ltr.mrl_limit, ltr.withdrawal_days_remaining,
             ltr.remarks, ltr.certificate_url,
             a.species, tr.medicine, f.farm_name, u.display_name AS farmer_name
      FROM lab_test_reports ltr
      JOIN samples s ON s.sample_id = ltr.sample_id
      JOIN sample_requests sr ON sr.sample_request_id = s.sample_request_id
      JOIN treatment_records tr ON sr.treatment_id = tr.treatment_id
      JOIN animals_or_batches a ON a.entity_id = sr.entity_id
      JOIN farmers fr ON sr.farmer_id = fr.farmer_id
      JOIN users u ON fr.user_id = u.user_id
      JOIN farms f ON tr.farm_id = f.farm_id
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

    // 🟢 Pending Requests - requests waiting for collection
    const [pending] = await db.execute(
      'SELECT COUNT(*) as count FROM sample_requests WHERE assigned_lab_id = ? AND status = ?',
      [lab.lab_id, 'requested']
    );

    // 🟡 Samples Collected - requests where samples have been collected
    const [collected] = await db.execute(
      'SELECT COUNT(*) as count FROM sample_requests WHERE assigned_lab_id = ? AND status = ?',
      [lab.lab_id, 'collected']
    );

    // 🔬 Under Testing - requests where samples are being tested
    const [tested] = await db.execute(
      'SELECT COUNT(*) as count FROM sample_requests WHERE assigned_lab_id = ? AND status = ?',
      [lab.lab_id, 'tested']
    );

    // ✅ Completed Reports - final reports submitted to authority
    const [completed] = await db.execute(
      'SELECT COUNT(*) as count FROM lab_test_reports WHERE lab_id = ?',
      [lab.lab_id]
    );

    console.log(`📊 Lab ${lab.lab_id} Stats: Pending=${pending[0].count}, Collected=${collected[0].count}, Tested=${tested[0].count}, Completed=${completed[0].count}`);

    res.json({
      pending: pending[0]?.count || 0,
      collected: collected[0]?.count || 0,
      tested: tested[0]?.count || 0,
      completed: completed[0]?.count || 0
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

// 📊 AUTHORITY ENDPOINTS - View all lab reports from all labs
// Get all lab test reports for authority (global view of all labs)
router.get('/authority/all-lab-reports', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [reports] = await db.execute(`
      SELECT ltr.report_id, ltr.final_status, ltr.tested_on,
             ltr.detected_residue, ltr.mrl_limit, ltr.withdrawal_days_remaining,
             ltr.remarks, ltr.certificate_url,
             a.species, tr.medicine, f.farm_name, u.display_name AS farmer_name,
             fr.farmer_id, l.lab_name, l.license_number
      FROM lab_test_reports ltr
      JOIN samples s ON ltr.sample_id = s.sample_id
      JOIN sample_requests sr ON s.sample_request_id = sr.sample_request_id
      JOIN treatment_records tr ON sr.treatment_id = tr.treatment_id
      JOIN animals_or_batches a ON sr.entity_id = a.entity_id
      JOIN farmers fr ON sr.farmer_id = fr.farmer_id
      JOIN users u ON fr.user_id = u.user_id
      JOIN farms f ON tr.farm_id = f.farm_id
      JOIN laboratories l ON ltr.lab_id = l.lab_id
      ORDER BY ltr.tested_on DESC
    `);

    console.log(`📊 Authority fetched ${reports.length} lab reports from all labs`);
    res.json(reports);
  } catch (e) {
    console.error('Authority all reports error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch lab reports', details: e.message });
  }
});

// Get lab reports filtered by status
router.get('/authority/reports-by-status/:status', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = ['safe', 'borderline', 'unsafe'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: safe, borderline, or unsafe' });
    }

    const [reports] = await db.execute(`
      SELECT ltr.report_id, ltr.final_status, ltr.tested_on,
             ltr.detected_residue, ltr.mrl_limit, ltr.withdrawal_days_remaining,
             a.species, tr.medicine, f.farm_name, u.display_name AS farmer_name,
             l.lab_name, l.state, l.district, l.taluk
      FROM lab_test_reports ltr
      JOIN samples s ON ltr.sample_id = s.sample_id
      JOIN sample_requests sr ON s.sample_request_id = sr.sample_request_id
      JOIN treatment_records tr ON sr.treatment_id = tr.treatment_id
      JOIN animals_or_batches a ON sr.entity_id = a.entity_id
      JOIN farmers fr ON sr.farmer_id = fr.farmer_id
      JOIN users u ON fr.user_id = u.user_id
      JOIN farms f ON tr.farm_id = f.farm_id
      JOIN laboratories l ON ltr.lab_id = l.lab_id
      WHERE ltr.final_status = ?
      ORDER BY ltr.tested_on DESC
    `, [status]);

    console.log(`📊 Authority fetched ${reports.length} ${status} lab reports`);
    res.json(reports);
  } catch (e) {
    console.error('Authority reports by status error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch reports by status', details: e.message });
  }
});

// Get unsafe reports alert (for authority dashboard)
router.get('/authority/unsafe-reports', authMiddleware, roleMiddleware(['authority']), async (req, res) => {
  try {
    const [reports] = await db.execute(`
      SELECT ltr.report_id, ltr.tested_on,
             ltr.detected_residue, ltr.mrl_limit,
             a.species, tr.medicine, f.farm_name, u.display_name AS farmer_name,
             l.lab_name, l.phone, l.email
      FROM lab_test_reports ltr
      JOIN samples s ON ltr.sample_id = s.sample_id
      JOIN sample_requests sr ON s.sample_request_id = sr.sample_request_id
      JOIN treatment_records tr ON sr.treatment_id = tr.treatment_id
      JOIN animals_or_batches a ON sr.entity_id = a.entity_id
      JOIN farmers fr ON sr.farmer_id = fr.farmer_id
      JOIN users u ON fr.user_id = u.user_id
      JOIN farms f ON tr.farm_id = f.farm_id
      JOIN laboratories l ON ltr.lab_id = l.lab_id
      WHERE ltr.final_status = 'unsafe'
      ORDER BY ltr.tested_on DESC
      LIMIT 50
    `);

    console.log(`🚨 Authority fetched ${reports.length} unsafe reports`);
    res.json(reports);
  } catch (e) {
    console.error('Unsafe reports error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch unsafe reports', details: e.message });
  }
});

module.exports = router;
