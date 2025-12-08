const express = require('express');
const router = express.Router();
const { authMiddleware, authorityOnly } = require('../middleware/auth');
const db = require('../config/database');

// List all lab reports (authority access)
router.get('/', authMiddleware, authorityOnly, async (req, res) => {
  try {
    const query = `
      SELECT lr.*, s.sample_type, s.collected_date, sr.entity_id, sr.treatment_id, t.medicine, t.start_date, t.end_date, f.farm_name
      FROM lab_test_reports lr
      JOIN samples s ON lr.sample_id = s.sample_id
      JOIN sample_requests sr ON s.sample_request_id = sr.sample_request_id
      JOIN treatment_records t ON sr.treatment_id = t.treatment_id
      JOIN farms f ON sr.farm_id = f.farm_id
      ORDER BY lr.created_at DESC
    `;
    const [rows] = await db.execute(query);
    res.json(rows);
  } catch (e) {
    console.error('Lab reports list error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch lab reports' });
  }
});

// Get single report
router.get('/:id', authMiddleware, authorityOnly, async (req, res) => {
  try {
    const id = req.params.id;
    const query = `
      SELECT lr.*, s.sample_type, s.collected_date, sr.entity_id, sr.treatment_id, t.medicine, t.start_date, t.end_date, f.farm_name
      FROM lab_test_reports lr
      JOIN samples s ON lr.sample_id = s.sample_id
      JOIN sample_requests sr ON s.sample_request_id = sr.sample_request_id
      JOIN treatment_records t ON sr.treatment_id = t.treatment_id
      JOIN farms f ON sr.farm_id = f.farm_id
      WHERE lr.report_id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('Lab report fetch error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

module.exports = router;
