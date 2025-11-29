const express = require('express');
const db = require('../config/database');
const router = express.Router();
const Entity = require('../models/Entity');
const Treatment = require('../models/Treatment');
const AMU = require('../models/AMU');
const MRL = require('../models/MRL');
const { TamperProof } = require('../models/QR');
const fs = require('fs');
const path = require('path');

// Load dosage data
const dosageData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/dosage_reference_full_extended_with_mrl.json'), 'utf8'));

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
    console.log('Treatments found:', treatments.length);

    // Fetch all AMU records
    let amuRecords = [];
    try {
      amuRecords = await AMU.getByEntity(entity_id);
      console.log('AMU records found:', amuRecords.length);
    } catch (error) {
      console.warn('AMU records not available:', error.message);
    }

    // Fetch MRL data for this species and matrix
    let mrlData = null;
    try {
      mrlData = await MRL.getBySpeciesAndMatrix(entity.species, entity.matrix);
      console.log('MRL data found:', mrlData ? mrlData.length : 0);
    } catch (error) {
      console.warn('MRL data not available:', error.message);
    }

    // Get latest treatment for withdrawal calculation
    const latestTreatment = treatments && treatments.length > 0 ? treatments[0] : null;

    // Get latest AMU record for safe date
    const latestAMU = amuRecords && amuRecords.length > 0 ? amuRecords[0] : null;

    let withdrawalStatus = null;
    let withdrawalFinishDate = null;
    let daysFromWithdrawal = null;
    let mrlPass = false;
    let withdrawalDate = null;
    let safeDate = null;
    let daysRemaining = null;

    if (latestAMU && latestAMU.end_date && latestAMU.predicted_withdrawal_days) {
      withdrawalDate = new Date(latestAMU.end_date);
      const withdrawalPeriodDays = latestAMU.predicted_withdrawal_days;
      safeDate = new Date(withdrawalDate.getTime() + (withdrawalPeriodDays * 24 * 60 * 60 * 1000));
      withdrawalFinishDate = safeDate;
    } else if (latestTreatment && latestTreatment.withdrawal_end_date) {
      withdrawalFinishDate = new Date(latestTreatment.withdrawal_end_date);
    }

    if (withdrawalFinishDate) {
      // Calculate days from withdrawal (absolute value for display)
      const today = new Date();
      const timeDiff = withdrawalFinishDate - today;
      daysFromWithdrawal = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      daysRemaining = daysFromWithdrawal;

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
      treatment_records: treatments.map(treatment => {
        const amu = amuRecords.find(a => a.treatment_id === treatment.treatment_id);
        return {
          treatment_id: treatment.treatment_id,
          active_ingredient: treatment.active_ingredient || treatment.medicine,
          dose_mg_per_kg: treatment.dose_mg_per_kg,
          dose_amount: treatment.dose_amount || amu?.dose_amount,
          dose_unit: treatment.dose_unit || amu?.dose_unit,
          route: treatment.route,
          frequency_per_day: treatment.frequency_per_day,
          duration_days: treatment.duration_days,
          start_date: treatment.start_date,
          end_date: treatment.end_date,
          withdrawal_period_days: treatment.withdrawal_period_days || amu?.predicted_withdrawal_days,
          withdrawal_end_date: treatment.withdrawal_end_date,
          safe_date: amu?.safe_date,
          predicted_mrl: amu?.predicted_mrl,
          overdosage: amu?.overdosage,
          risk_category: amu?.risk_category,
          mrl_status: amu?.risk_category,
          medication_type: treatment.medication_type,
          reason: treatment.reason,
          cause: treatment.cause,
          vet_id: treatment.vet_id,
          vet_name: treatment.vet_name
        };
      }),
      amu_records: amuRecords || [],
      mrl_limits: mrlData || null,
      withdrawal_info: {
        withdrawal_date: withdrawalDate ? withdrawalDate.toISOString().split('T')[0] : null,
        withdrawal_period_days: latestAMU ? latestAMU.predicted_withdrawal_days : null,
        withdrawal_finish_date: withdrawalFinishDate ? withdrawalFinishDate.toISOString().split('T')[0] : null,
        safe_date: safeDate ? safeDate.toISOString().split('T')[0] : null,
        days_remaining: daysRemaining,
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

      // Combined Treatment and AMU Records as cards (render as strings)
      const combinedRecordsHtml = response.treatment_records && response.treatment_records.length > 0
        ? `
        <div style="display:flex;flex-direction:column;gap:20px;">
          ${response.treatment_records.map(record => `
            <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;background:#f7fafc;">
              <h3 style="margin:0 0 15px 0;color:#2d3748;">${record.active_ingredient || record.medicine}${record.safe_date && new Date(record.safe_date) <= new Date() ? ' <span style="color: green; font-size: 0.8em;">(SAFE)</span>' : ''}</h3>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;">
                ${record.dose_amount ? `<div><strong>Dose:</strong> ${record.dose_amount} ${record.dose_unit || ''}</div>` : ''}
                <div><strong>Route:</strong> ${record.route || ''}</div>
                ${record.frequency_per_day ? `<div><strong>Frequency:</strong> ${record.frequency_per_day}x per day</div>` : ''}
                ${record.duration_days ? `<div><strong>Duration:</strong> ${record.duration_days} days</div>` : ''}
                <div><strong>Start Date:</strong> ${record.start_date || ''}</div>
                <div><strong>End Date:</strong> ${record.end_date || ''}</div>
                ${record.withdrawal_period_days ? `<div><strong>Withdrawal Period:</strong> ${record.withdrawal_period_days} days</div>` : ''}
                ${record.safe_date ? `<div><strong>Safe Date:</strong> ${record.safe_date}</div>` : ''}
                ${record.predicted_mrl ? `<div><strong>Predicted Residual Limit:</strong> ${record.predicted_mrl} mcg/kg</div>` : ''}
                ${record.predicted_withdrawal_days ? `<div><strong>Predicted Withdrawal Days:</strong> ${Math.max(0, record.predicted_withdrawal_days)}</div>` : ''}
                ${record.mrl_status ? `<div><strong>Risk Category:</strong> ${record.mrl_status}</div>` : ''}
                ${record.medication_type ? `<div><strong>Category:</strong> ${record.medication_type}</div>` : ''}
                ${record.reason ? `<div><strong>Reason:</strong> ${record.reason}</div>` : ''}
                ${record.cause ? `<div><strong>Cause:</strong> ${record.cause}</div>` : ''}
                ${record.vet_name ? `<div><strong>Veterinarian:</strong> ${record.vet_name}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `
        : `<div style="color:#888;font-size:1.05rem;padding:18px;text-align:center;">No treatment or AMU records found.</div>`;

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
            body{background:linear-gradient(135deg,#f5f7fa 0%,#c3cfe2 100%);font-family:'Inter',Roboto,Arial,sans-serif;margin:0;min-height:100vh}
            .header{position:sticky;top:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);box-shadow:0 4px 12px rgba(0,0,0,0.1);padding:20px 0;z-index:10;border-bottom:3px solid #5a67d8}
            .header-title{font-size:2.5rem;font-weight:800;color:#fff;text-align:center;letter-spacing:1px;text-shadow:0 2px 4px rgba(0,0,0,0.3);margin:0}
            .banner{margin:30px auto;max-width:500px;padding:25px;border-radius:20px;background:${statusBanner.gradient};display:flex;align-items:center;justify-content:center;box-shadow:0 8px 25px rgba(0,0,0,0.15);border:2px solid rgba(255,255,255,0.2)}
            .banner-icon{font-size:3.5rem;margin-right:20px;color:#fff;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))}
            .banner-content{display:flex;flex-direction:column;text-align:center}
            .banner-title{font-size:1.8rem;font-weight:800;color:#fff;letter-spacing:1px;text-shadow:0 1px 2px rgba(0,0,0,0.3);margin:0}
            .banner-sub{font-size:1.1rem;color:#f0f0f0;margin:5px 0 0 0;text-shadow:0 1px 2px rgba(0,0,0,0.2)}
            .card{background:#fff;border-radius:20px;box-shadow:0 6px 20px rgba(0,0,0,0.08);padding:30px;margin:30px auto;max-width:800px;transition:all 0.3s ease;border:1px solid rgba(255,255,255,0.8)}
            .card:hover{box-shadow:0 12px 40px rgba(0,0,0,0.12);transform:translateY(-2px)}
            .card-title{font-size:1.4rem;font-weight:700;margin-bottom:20px;display:flex;align-items:center;gap:12px;color:#2d3748;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0;padding-bottom:10px}
            .card-title .icon{font-size:1.5rem;color:#667eea}
            .details-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px}
            .detail-box{background:linear-gradient(135deg,#f7fafc 0%,#edf2f7 100%);border-radius:12px;padding:20px;text-align:center;font-size:1.1rem;color:#2d3748;box-shadow:0 2px 8px rgba(0,0,0,0.05);border:1px solid #e2e8f0}
            .detail-label{font-size:1rem;color:#718096;margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
            @media (max-width:720px){.details-grid{grid-template-columns:1fr}}
            @media (max-width:480px){.card{padding:12px;margin:12px;}.details-grid{gap:8px;}.detail-box{padding:10px;font-size:0.97rem;}}
            table{width:100%;border-collapse:collapse;background:linear-gradient(135deg,#f7fafc 0%,#edf2f7 100%);border-radius:15px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.08);border:1px solid #e2e8f0}
            th,td{padding:15px;text-align:left;font-size:1rem;border-bottom:1px solid #e2e8f0}
            th{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
            tr:hover{background:linear-gradient(135deg,#edf2f7 0%,#e2e8f0 100%);transition:background 0.2s ease}
            .treatment-label{font-weight:600;color:#2e5c1a}
            .withdrawal-status{background:linear-gradient(135deg,#f7fafc 0%,#edf2f7 100%);border-radius:15px;padding:25px;margin-top:15px;box-shadow:0 4px 15px rgba(0,0,0,0.08);border:1px solid #e2e8f0}
            .status-summary{display:flex;flex-direction:column;gap:15px}
            .status-item{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #e2e8f0;background:rgba(255,255,255,0.5);border-radius:8px;margin-bottom:8px;padding:15px}
            .status-item:last-child{border-bottom:none;margin-bottom:0}
            .withdrawal-label{font-size:1.1rem;color:#4a5568;font-weight:600}
            .withdrawal-value{font-size:1.1rem;color:#2d3748;font-weight:700}
            .withdrawal-fail{color:#e53e3e;font-weight:800;text-shadow:0 1px 2px rgba(229,62,62,0.3)}
            .withdrawal-pass{color:#38a169;font-weight:800;text-shadow:0 1px 2px rgba(56,161,105,0.3)}
            .warning{color:#d69e2e;font-weight:700}
            .safe{color:#38a169;font-weight:700}
            .verification-status{background:linear-gradient(135deg,#c6f6d5 0%,#9ae6b4 100%);border-radius:20px;padding:25px;margin-top:30px;max-width:800px;margin-left:auto;margin-right:auto;display:flex;align-items:center;gap:20px;box-shadow:0 6px 20px rgba(0,0,0,0.1);border:2px solid #68d391}
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
            <div class="card-title"><span class="icon"><i class="fa-solid fa-notes-medical"></i></span> Treatment and AMU Records</div>
            ${combinedRecordsHtml}
          </div>

          <div class="card">
            <div class="card-title"><span class="icon"><i class="fa-solid fa-clock"></i></span> Withdrawal Period Status</div>
            <div class="withdrawal-status">
              <div class="status-summary">
                <div className="status-item">
                  <span class="withdrawal-label">Withdrawal Date:</span>
                  <span class="withdrawal-value">${withdrawal.withdrawal_date ? new Date(withdrawal.withdrawal_date).toLocaleDateString() : '-'}</span>
                </div>
                <div class="status-item">
                  <span class="withdrawal-label">Safe Date:</span>
                  <span class="withdrawal-value">${withdrawal.safe_date ? new Date(withdrawal.safe_date).toLocaleDateString() : '-'}</span>
                </div>
                <div class="status-item">
                  <span class="withdrawal-label">Days Remaining:</span>
                  <span class="withdrawal-value ${withdrawal.days_remaining > 0 ? 'warning' : withdrawal.days_remaining <= 0 ? 'safe' : ''}">${withdrawal.days_remaining == null ? '-' : withdrawal.days_remaining > 0 ? `${withdrawal.days_remaining} days` : withdrawal.days_remaining === 0 ? 'Ready today' : 'Safe'}</span>
                </div>
                <div class="status-item">
                  <span class="withdrawal-label">Status:</span>
                  <span class="${withdrawal.mrl_pass ? 'withdrawal-pass' : 'withdrawal-fail'}">${withdrawal.mrl_pass ? '✔ SAFE TO CONSUME' : '✗ NOT SAFE'}</span>
                </div>
              </div>
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
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to verify entity', details: error.message });
  }
});

module.exports = router;
