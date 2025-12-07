const express = require('express');
const router = express.Router();
const db = require('../config/database');
const {
  ENTITY_TYPES,
  buildCanonicalString,
  logTamperProof,
  verifyTamperProof
} = require('../utils/tamperProofService');

// ========================================
// TREATMENT RECORDS ROUTES
// ========================================

/**
 * POST /api/tamper-proof/treatment
 * Create treatment record with tamper-proof logging
 */
router.post('/treatment', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      entity_id,
      farm_id,
      user_id,
      species,
      medication_type,
      is_vaccine,
      vaccine_interval_days,
      vaccine_total_months,
      next_due_date,
      vaccine_end_date,
      vet_id,
      vet_name,
      reason,
      diagnosis,
      cause,
      medicine,
      start_date,
      end_date,
      route,
      dose_amount,
      dose_unit,
      frequency_per_day,
      duration_days,
      status
    } = req.body;

    // Insert treatment record
    const [result] = await connection.execute(
      `INSERT INTO treatment_records 
       (entity_id, farm_id, user_id, species, medication_type, is_vaccine, 
        vaccine_interval_days, vaccine_total_months, next_due_date, vaccine_end_date,
        vet_id, vet_name, reason, diagnosis, cause, medicine, start_date, end_date,
        route, dose_amount, dose_unit, frequency_per_day, duration_days, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity_id, farm_id, user_id, species, medication_type, is_vaccine || false,
        vaccine_interval_days, vaccine_total_months, next_due_date, vaccine_end_date,
        vet_id, vet_name, reason, diagnosis, cause, medicine, start_date, end_date,
        route, dose_amount, dose_unit, frequency_per_day, duration_days, status || 'approved'
      ]
    );

    const treatmentId = result.insertId;

    // Get the inserted record for canonical string generation
    const [rows] = await connection.execute(
      'SELECT * FROM treatment_records WHERE treatment_id = ?',
      [treatmentId]
    );

    const treatmentData = rows[0];

    // Build canonical string
    const canonical = buildCanonicalString(ENTITY_TYPES.TREATMENT, treatmentData);

    // Log tamper-proof hash
    const tamperProof = await logTamperProof(
      ENTITY_TYPES.TREATMENT,
      treatmentId,
      canonical
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      treatment_id: treatmentId,
      tamper_proof: tamperProof
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating treatment record:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/tamper-proof/treatment/:id/verify
 * Verify integrity of treatment record
 */
router.get('/treatment/:id/verify', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const treatmentId = req.params.id;

    // Get current treatment record
    const [rows] = await connection.execute(
      'SELECT * FROM treatment_records WHERE treatment_id = ?',
      [treatmentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Treatment record not found'
      });
    }

    const treatmentData = rows[0];

    // Verify tamper-proof
    const verification = await verifyTamperProof(
      ENTITY_TYPES.TREATMENT,
      treatmentId,
      treatmentData
    );

    res.json({
      success: true,
      verification
    });

  } catch (error) {
    console.error('Error verifying treatment record:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// ========================================
// AMU RECORDS ROUTES
// ========================================

/**
 * POST /api/tamper-proof/amu
 * Create AMU record with tamper-proof logging
 */
router.post('/amu', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      treatment_id,
      entity_id,
      farm_id,
      user_id,
      species,
      medication_type,
      matrix,
      medicine,
      active_ingredient,
      category_type,
      reason,
      cause,
      route,
      dose_amount,
      dose_unit,
      frequency_per_day,
      duration_days,
      start_date,
      end_date,
      predicted_mrl,
      predicted_withdrawal_days,
      safe_date,
      risk_percent,
      overdosage,
      risk_category,
      worst_tissue,
      model_version
    } = req.body;

    // Insert AMU record
    const [result] = await connection.execute(
      `INSERT INTO amu_records 
       (treatment_id, entity_id, farm_id, user_id, species, medication_type, matrix,
        medicine, active_ingredient, category_type, reason, cause, route,
        dose_amount, dose_unit, frequency_per_day, duration_days, start_date, end_date,
        predicted_mrl, predicted_withdrawal_days, safe_date, risk_percent, overdosage,
        risk_category, worst_tissue, model_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        treatment_id, entity_id, farm_id, user_id, species, medication_type, matrix,
        medicine, active_ingredient, category_type, reason, cause, route,
        dose_amount, dose_unit, frequency_per_day, duration_days, start_date, end_date,
        predicted_mrl, predicted_withdrawal_days, safe_date, risk_percent, overdosage || false,
        risk_category, worst_tissue, model_version
      ]
    );

    const amuId = result.insertId;

    // Get the inserted record
    const [rows] = await connection.execute(
      'SELECT * FROM amu_records WHERE amu_id = ?',
      [amuId]
    );

    const amuData = rows[0];

    // Build canonical string and log
    const canonical = buildCanonicalString(ENTITY_TYPES.AMU, amuData);
    const tamperProof = await logTamperProof(ENTITY_TYPES.AMU, amuId, canonical);

    await connection.commit();

    res.status(201).json({
      success: true,
      amu_id: amuId,
      tamper_proof: tamperProof
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating AMU record:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/tamper-proof/amu/:id/verify
 * Verify integrity of AMU record
 */
router.get('/amu/:id/verify', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const amuId = req.params.id;

    const [rows] = await connection.execute(
      'SELECT * FROM amu_records WHERE amu_id = ?',
      [amuId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'AMU record not found'
      });
    }

    const amuData = rows[0];
    const verification = await verifyTamperProof(ENTITY_TYPES.AMU, amuId, amuData);

    res.json({
      success: true,
      verification
    });

  } catch (error) {
    console.error('Error verifying AMU record:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// ========================================
// VACCINATION HISTORY ROUTES
// ========================================

/**
 * POST /api/tamper-proof/vaccination
 * Create vaccination record with tamper-proof logging
 */
router.post('/vaccination', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      entity_id,
      treatment_id,
      vaccine_name,
      given_date,
      interval_days,
      next_due_date,
      vaccine_total_months,
      vaccine_end_date
    } = req.body;

    const [result] = await connection.execute(
      `INSERT INTO vaccination_history 
       (entity_id, treatment_id, vaccine_name, given_date, interval_days, 
        next_due_date, vaccine_total_months, vaccine_end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [entity_id, treatment_id, vaccine_name, given_date, interval_days,
       next_due_date, vaccine_total_months, vaccine_end_date]
    );

    const vaccId = result.insertId;

    const [rows] = await connection.execute(
      'SELECT * FROM vaccination_history WHERE vacc_id = ?',
      [vaccId]
    );

    const vaccData = rows[0];
    const canonical = buildCanonicalString(ENTITY_TYPES.VACCINATION, vaccData);
    const tamperProof = await logTamperProof(ENTITY_TYPES.VACCINATION, vaccId, canonical);

    await connection.commit();

    res.status(201).json({
      success: true,
      vacc_id: vaccId,
      tamper_proof: tamperProof
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating vaccination record:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/tamper-proof/vaccination/:id/verify
 */
router.get('/vaccination/:id/verify', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const vaccId = req.params.id;

    const [rows] = await connection.execute(
      'SELECT * FROM vaccination_history WHERE vacc_id = ?',
      [vaccId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vaccination record not found'
      });
    }

    const vaccData = rows[0];
    const verification = await verifyTamperProof(ENTITY_TYPES.VACCINATION, vaccId, vaccData);

    res.json({
      success: true,
      verification
    });

  } catch (error) {
    console.error('Error verifying vaccination record:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// ========================================
// DISTRIBUTOR VERIFICATION ROUTES
// ========================================

/**
 * POST /api/tamper-proof/distributor-verification
 */
router.post('/distributor-verification', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      distributor_id,
      qr_id,
      entity_id,
      verification_status,
      is_withdrawal_safe,
      safe_date,
      reason
    } = req.body;

    const [result] = await connection.execute(
      `INSERT INTO distributor_verification_logs 
       (distributor_id, qr_id, entity_id, verification_status, 
        is_withdrawal_safe, safe_date, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [distributor_id, qr_id, entity_id, verification_status,
       is_withdrawal_safe, safe_date, reason]
    );

    const logId = result.insertId;

    const [rows] = await connection.execute(
      'SELECT * FROM distributor_verification_logs WHERE log_id = ?',
      [logId]
    );

    const logData = rows[0];
    const canonical = buildCanonicalString(ENTITY_TYPES.DISTRIBUTOR_VERIFICATION, logData);
    const tamperProof = await logTamperProof(ENTITY_TYPES.DISTRIBUTOR_VERIFICATION, logId, canonical);

    await connection.commit();

    res.status(201).json({
      success: true,
      log_id: logId,
      tamper_proof: tamperProof
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating distributor verification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/tamper-proof/distributor-verification/:id/verify
 */
router.get('/distributor-verification/:id/verify', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const logId = req.params.id;

    const [rows] = await connection.execute(
      'SELECT * FROM distributor_verification_logs WHERE log_id = ?',
      [logId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Verification log not found'
      });
    }

    const logData = rows[0];
    const verification = await verifyTamperProof(ENTITY_TYPES.DISTRIBUTOR_VERIFICATION, logId, logData);

    res.json({
      success: true,
      verification
    });

  } catch (error) {
    console.error('Error verifying distributor log:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// ========================================
// LOAN REQUEST ROUTES
// ========================================

/**
 * POST /api/tamper-proof/loan
 */
router.post('/loan', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      farmer_id,
      farm_id,
      purpose,
      amount_requested,
      description,
      status
    } = req.body;

    const [result] = await connection.execute(
      `INSERT INTO loan_requests 
       (farmer_id, farm_id, purpose, amount_requested, description, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [farmer_id, farm_id, purpose, amount_requested, description, status || 'pending']
    );

    const loanId = result.insertId;

    const [rows] = await connection.execute(
      'SELECT * FROM loan_requests WHERE loan_id = ?',
      [loanId]
    );

    const loanData = rows[0];
    const canonical = buildCanonicalString(ENTITY_TYPES.LOAN, loanData);
    const tamperProof = await logTamperProof(ENTITY_TYPES.LOAN, loanId, canonical);

    await connection.commit();

    res.status(201).json({
      success: true,
      loan_id: loanId,
      tamper_proof: tamperProof
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating loan request:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/tamper-proof/loan/:id/verify
 */
router.get('/loan/:id/verify', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const loanId = req.params.id;

    const [rows] = await connection.execute(
      'SELECT * FROM loan_requests WHERE loan_id = ?',
      [loanId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Loan request not found'
      });
    }

    const loanData = rows[0];
    const verification = await verifyTamperProof(ENTITY_TYPES.LOAN, loanId, loanData);

    res.json({
      success: true,
      verification
    });

  } catch (error) {
    console.error('Error verifying loan request:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
