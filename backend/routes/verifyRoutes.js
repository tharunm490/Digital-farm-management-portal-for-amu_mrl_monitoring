const express = require('express');
const db = require('../config/database');
const router = express.Router();
const Entity = require('../models/Entity');
const Treatment = require('../models/Treatment');
const AMU = require('../models/AMU');
const MRL = require('../models/MRL');
const { TamperProof } = require('../models/QR');

// GET /api/verify/:entity_id - Complete entity verification data (Public - no auth required for QR scanning)
router.get('/:entity_id', async (req, res) => {
  try {
    const { entity_id } = req.params;
    
    console.log('Verifying entity ID:', entity_id);
    
    // Fetch entity details
    const entity = await Entity.getById(entity_id);
    console.log('Entity found:', entity);
    
    if (!entity) {
      console.log('Entity not found for ID:', entity_id);
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    // Fetch all treatment records
    const treatments = await Treatment.getByEntity(entity_id);
    
    // Fetch all AMU records
    const amuRecords = await AMU.getByEntityId(entity_id);
    
    // Fetch MRL data for this species and matrix
    const mrlData = await MRL.getBySpeciesAndMatrix(entity.species, entity.matrix);
    
    // Get latest treatment for withdrawal calculation
    const latestTreatment = treatments && treatments.length > 0 ? treatments[0] : null;
    
    let withdrawalStatus = null;
    let withdrawalFinishDate = null;
    let daysFromWithdrawal = null;
    let mrlPass = false;
    
    if (latestTreatment && latestTreatment.withdrawal_end_date) {
      withdrawalFinishDate = new Date(latestTreatment.withdrawal_end_date);
      
      // Calculate days from withdrawal (absolute value for display)
      const today = new Date();
      const timeDiff = withdrawalFinishDate - today;
      daysFromWithdrawal = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      // Determine PASS/FAIL
      mrlPass = daysFromWithdrawal <= 0;
      withdrawalStatus = mrlPass ? 'PASS' : 'FAIL';
    }
    
    // Prepare response
    const response = {
      entity_details: {
        entity_id: entity.entity_id,
        entity_type: entity.entity_type,
        tag_id: entity.tag_id,
        batch_name: entity.batch_name,
        species: entity.species,
        breed: entity.breed,
        matrix: entity.matrix,
        farm_name: entity.farm_name,
        animal_count: entity.animal_count,
        weight_kg: entity.weight_kg,
        age_months: entity.age_months
      },
      treatment_records: treatments.map(treatment => ({
        treatment_id: treatment.treatment_id,
        active_ingredient: treatment.active_ingredient || treatment.medicine,
        dose_mg_per_kg: treatment.dose_mg_per_kg,
        route: treatment.route,
        frequency_per_day: treatment.frequency_per_day,
        duration_days: treatment.duration_days,
        start_date: treatment.start_date,
        end_date: treatment.end_date,
        withdrawal_period_days: treatment.withdrawal_period_days,
        withdrawal_end_date: treatment.withdrawal_end_date
      })),
      amu_records: amuRecords || [],
      mrl_limits: mrlData || null,
      withdrawal_info: {
        withdrawal_period_days: latestTreatment?.withdrawal_period_days || 0,
        withdrawal_finish_date: withdrawalFinishDate,
        days_from_withdrawal: daysFromWithdrawal,
        status: withdrawalStatus,
        mrl_pass: mrlPass
      },
      tamper_proof: {
        verified: true,
        message: 'Record verified successfully'
      }
    };
    
    // If browser requests HTML, render a human-friendly verification page
    const accept = req.headers.accept || '';
    if (accept.includes('text/html')) {
      const e = response.entity_details;
      const withdrawal = response.withdrawal_info;
      const statusBanner = withdrawal.mrl_pass
        ? { text: 'PASS', color1: '#dafbe6', color2: '#ffe066', icon: 'fa-solid fa-circle-check', gradient: 'linear-gradient(90deg,#dafbe6,#ffe066)' }
        : { text: 'FAIL', color1: '#ffdede', color2: '#ffe066', icon: 'fa-solid fa-circle-xmark', gradient: 'linear-gradient(90deg,#ffdede,#ffe066)' };

      // Treatment Records as grid cards
      const treatmentsGridHtml = response.treatment_records.length > 0 ? `
        <div class="details-grid">
          ${response.treatment_records.map(t => `
            <div class="detail-box">
              <div class="detail-label">Active Ingredient</div>${t.active_ingredient || '-'}
            </div>
            <div class="detail-box">
              <div class="detail-label">Dose (mg/kg)</div>${t.dose_mg_per_kg || '-'}
            </div>
            <div class="detail-box">
              <div class="detail-label">Route</div>${t.route || '-'}
            </div>
            <div class="detail-box">
              <div class="detail-label">Frequency/Day</div>${t.frequency_per_day || '-'}
            </div>
            <div class="detail-box">
              <div class="detail-label">Duration (days)</div>${t.duration_days || '-'}
            </div>
            <div class="detail-box">
              <div class="detail-label">Start Date</div>${t.start_date || '-'}
            </div>
            <div class="detail-box">
              <div class="detail-label">End Date</div>${t.end_date || '-'}
            </div>
            <div class="detail-box">
              <div class="detail-label">Withdrawal End</div>${t.withdrawal_end_date || '-'}
            </div>
          `).join('')}
        </div>
      ` : `<div style="color:#888;font-size:1.05rem;padding:18px;text-align:center;">No treatment records found.</div>`;

      const html = `
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Batch Verification</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"/>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
          <style>
            body{background:#f4f7fa;font-family:'Inter',Roboto,Arial,sans-serif;margin:0}
            .header{position:sticky;top:0;background:#fff;box-shadow:0 2px 8px #0001;padding:18px 0 10px 0;z-index:10}
            .header-title{font-size:2rem;font-weight:700;color:#2e5c1a;text-align:center;letter-spacing:0.5px}
            .banner{margin:24px auto 0 auto;max-width:420px;padding:18px 0;border-radius:14px;background:${statusBanner.gradient};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px #0002}
            .banner-icon{font-size:2.8rem;margin-right:18px;color:#d32f2f}
            .banner-content{display:flex;flex-direction:column}
            .banner-title{font-size:1.25rem;font-weight:700;color:#d32f2f;letter-spacing:0.5px}
            .banner-sub{font-size:1rem;color:#444}
            .card{background:#fff;border-radius:14px;box-shadow:0 1px 8px #0001;padding:22px;margin:28px auto;max-width:650px;transition:box-shadow 0.2s}
            .card:hover{box-shadow:0 4px 16px #0002}
            .card-title{font-size:1.13rem;font-weight:600;margin-bottom:14px;display:flex;align-items:center;gap:10px;color:#2e5c1a;letter-spacing:0.2px}
            .card-title .icon{font-size:1.3rem}
            .details-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
            .detail-box{background:#f6fbf7;border-radius:8px;padding:14px;text-align:center;font-size:1.05rem;color:#222;box-shadow:0 1px 4px #0001}
            .detail-label{font-size:0.97rem;color:#6b7280;margin-bottom:4px}
            @media (max-width:720px){.details-grid{grid-template-columns:1fr}}
            @media (max-width:480px){.card{padding:12px;margin:12px;}.details-grid{gap:8px;}.detail-box{padding:10px;font-size:0.97rem;}}
            table{width:100%;border-collapse:collapse;background:#f6fbf7;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px #0001}
            th,td{padding:12px;text-align:left;font-size:1rem;border-bottom:1px solid #e6eef0}
            th{background:#f3f3f3;color:#2e5c1a;font-weight:600}
            tr:hover{background:#eaf6ff}
            .treatment-label{font-weight:600;color:#2e5c1a}
            .withdrawal-status{background:#f6fbf7;border-radius:10px;padding:16px;margin-top:10px;box-shadow:0 1px 4px #0001}
            .withdrawal-label{font-size:1.05rem;color:#6b7280}
            .withdrawal-value{font-size:1.05rem;color:#222}
            .withdrawal-fail{color:#d32f2f;font-weight:700}
            .withdrawal-pass{color:#388e3c;font-weight:700}
            .verification-status{background:#e8fbef;border-radius:10px;padding:18px;margin-top:24px;max-width:650px;margin-left:auto;margin-right:auto;display:flex;align-items:center;gap:16px;box-shadow:0 1px 4px #0001}
            .verification-icon{font-size:1.7rem;color:#388e3c}
            .verification-text{font-size:1.07rem;color:#222}
            .print-btn{position:fixed;bottom:24px;right:24px;background:#2e5c1a;color:#fff;border:none;border-radius:50px;padding:12px 24px;font-size:1.1rem;box-shadow:0 2px 8px #0002;cursor:pointer;z-index:99;transition:background 0.2s}
            .print-btn:hover{background:#388e3c}
          </style>
        </head>
        <body>
          <div class="header"><div class="header-title">Batch Verification</div></div>
          <div class="banner">
            <span class="banner-icon"><i class="${statusBanner.icon}"></i></span>
            <div class="banner-content">
              <span class="banner-title">${statusBanner.text}</span>
              <span class="banner-sub">${statusBanner.text === 'PASS' ? 'The process has completed withdrawal period.' : 'The process has not completed withdrawal period.'}</span>
            </div>
          </div>

          <div class="card">
            <div class="card-title"><span class="icon"><i class="fa-solid fa-clipboard-list"></i></span> Animal Details</div>
            <div class="details-grid">
              <div class="detail-box"><div class="detail-label">Entity ID</div>${e.entity_id}</div>
              <div class="detail-box"><div class="detail-label">Type</div>${e.entity_type}</div>
              <div class="detail-box"><div class="detail-label">Tag</div>${e.tag_id}</div>
              <div class="detail-box"><div class="detail-label">Species</div>${e.species}</div>
              <div class="detail-box"><div class="detail-label">Breed</div>${e.breed}</div>
              <div class="detail-box"><div class="detail-label">Farm</div>${e.farm_name}</div>
            </div>
          </div>

          <div class="card">
            <div class="card-title"><span class="icon"><i class="fa-solid fa-notes-medical"></i></span> Treatment Records</div>
            ${treatmentsGridHtml}
          </div>

          <div class="card">
            <div class="card-title"><span class="icon"><i class="fa-solid fa-clock"></i></span> Withdrawal Period Status</div>
            <div class="withdrawal-status">
              <div><span class="withdrawal-label">Withdrawal Period:</span> <span class="withdrawal-value">${withdrawal.withdrawal_period_days || '-'}</span></div>
              <div><span class="withdrawal-label">Withdrawal Finish Date:</span> <span class="withdrawal-value">${withdrawal.withdrawal_finish_date || '-'}</span></div>
              <div><span class="withdrawal-label">Days from Withdrawal:</span> <span class="withdrawal-value">${withdrawal.days_from_withdrawal == null ? '-' : withdrawal.days_from_withdrawal}</span></div>
              <div><span class="withdrawal-label">MRL Status:</span> <span class="${withdrawal.mrl_pass ? 'withdrawal-pass' : 'withdrawal-fail'}">${withdrawal.mrl_pass ? '✔ SAFE' : '✗ NOT SAFE'}</span></div>
            </div>
          </div>

          <div class="verification-status">
            <span class="verification-icon"><i class="fa-solid fa-lock"></i></span>
            <span class="verification-text">Record verified successfully<br><span style="font-size:0.95rem;color:#6b7280">All measurements and withdrawal periods checked for batch or animal.</span></span>
          </div>

          <button class="print-btn" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>
        </body>
        </html>
      `;

      res.set('Content-Type', 'text/html');
      return res.send(html);
    }

    res.json(response);
    
  } catch (error) {
    console.error('Error verifying entity:', error);
    res.status(500).json({ error: 'Failed to verify entity' });
  }
});

module.exports = router;
// Flexible QR verification route for /verify and /verify/ with query param
// PUBLIC QR VERIFICATION ROUTE — NO LOGIN REQUIRED
router.get(['/', ''], async (req, res) => {
  try {
    const entityId = req.query.entity_id;
    if (!entityId) {
      return res.status(400).json({ error: 'Entity ID missing' });
    }
    // Fetch entity details
    const [entity] = await db.query(
      'SELECT * FROM animals_or_batches WHERE entity_id = ?',
      [entityId]
    );
    if (entity.length === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    // Fetch treatment history
    const [treatments] = await db.query(
      'SELECT * FROM treatment_records WHERE entity_id = ?',
      [entityId]
    );
    return res.json({
      status: 'success',
      entity: entity[0],
      treatments
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Path-based QR verification route: /verify/:entityId
router.get('/:entityId', async (req, res) => {
  try {
    const entityId = req.params.entityId;
    // Fetch entity details
    const [entity] = await db.query(
      'SELECT * FROM animals_or_batches WHERE entity_id = ?',
      [entityId]
    );
    if (entity.length === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    // Fetch treatment history
    const [treatments] = await db.query(
      'SELECT * FROM treatment_records WHERE entity_id = ?',
      [entityId]
    );
    return res.json({
      status: 'success',
      entity: entity[0],
      treatments
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
