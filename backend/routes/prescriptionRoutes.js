const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const db = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Helper to ensure folder exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

// GET /api/prescription/:treatmentId - Generate and stream prescription PDF
router.get('/:treatmentId', authMiddleware, roleMiddleware(['veterinarian','authority','farmer']), async (req, res) => {
  const { treatmentId } = req.params;

  try {
    // Fetch treatment data and related entities
    const [tRows] = await db.execute(
      `SELECT tr.*, a.entity_name, a.species, a.body_weight_kg, f.farm_id, f.name as farm_name, f.state, f.district, f.taluk, u.name as vet_name, u.license_number, u.email as vet_email, u.phone as vet_phone
       FROM treatment_records tr
       LEFT JOIN animals_or_batches a ON tr.entity_id = a.entity_id
       LEFT JOIN farms f ON tr.farm_id = f.farm_id
       LEFT JOIN users u ON tr.vet_id = u.user_id
       WHERE tr.treatment_id = ? LIMIT 1`,
      [treatmentId]
    );

    if (!tRows || tRows.length === 0) return res.status(404).json({ error: 'Treatment not found' });
    const tr = tRows[0];

    // Fetch medicines for this treatment (assumes table treatment_medicines exists)
    const [medRows] = await db.execute(
      `SELECT tm.*, m.name as medicine_name FROM treatment_medicines tm
       LEFT JOIN medicines m ON tm.medicine_id = m.medicine_id
       WHERE tm.treatment_id = ?`,
      [treatmentId]
    );

    // Fetch AMU / withdrawal info
    const [amuRows] = await db.execute(
      `SELECT * FROM amu_records WHERE treatment_id = ? LIMIT 1`,
      [treatmentId]
    );
    const amu = amuRows && amuRows[0] ? amuRows[0] : null;

    // Prepare file path
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'prescriptions');
    ensureDir(uploadsDir);

    const prescriptionNumber = tr.prescription_number || `TR-${tr.treatment_id}`;
    const filename = `prescription_${treatmentId}_${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, filename);

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // HEADER
    const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 30, { width: 80 });
    }
    doc.fontSize(18).font('Helvetica-Bold').text('FarmTrack', 130, 40);
    doc.fontSize(16).text('Treatment Prescription', { align: 'right' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Date: ${new Date(tr.created_at || Date.now()).toLocaleDateString()}`, { align: 'right' });
    doc.text(`Prescription No: ${prescriptionNumber}`, { align: 'right' });

    doc.moveDown(1);

    // FARMER & ANIMAL DETAILS
    doc.fontSize(12).font('Helvetica-Bold').text('Farmer & Animal Details');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Farmer Name: ${tr.farmer_name || ''}`);
    doc.text(`Farm Name: ${tr.farm_name || tr.farm_name || ''}`);
    doc.text(`Entity / Tag: ${tr.entity_name || tr.entity_id || ''}`);
    doc.text(`Species: ${tr.species || ''}`);
    doc.text(`Body Weight: ${tr.body_weight_kg || tr.body_weight || 'N/A'} kg`);
    doc.text(`Location: ${tr.state || ''} / ${tr.district || ''} / ${tr.taluk || ''}`);

    doc.moveDown(0.5);

    // VET DETAILS
    doc.fontSize(12).font('Helvetica-Bold').text('Veterinarian Details');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${tr.vet_name || ''}`);
    doc.text(`License: ${tr.license_number || ''}`);
    doc.text(`Contact: ${tr.vet_phone || ''} | ${tr.vet_email || ''}`);
    doc.moveDown(0.5);

    // TREATMENT SUMMARY TABLE
    doc.fontSize(12).font('Helvetica-Bold').text('Treatment Summary');
    doc.moveDown(0.2);

    // table header
    const tableTop = doc.y;
    const itemX = 40;
    const colWidths = { date: 80, diagnosis: 120, medicine: 120, dose: 50, route: 60, duration: 60, frequency: 60, start: 60, end: 60 };

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Date', itemX, tableTop, { width: colWidths.date });
    doc.text('Diagnosis', itemX + colWidths.date, tableTop, { width: colWidths.diagnosis });
    doc.text('Medicine', itemX + colWidths.date + colWidths.diagnosis, tableTop, { width: colWidths.medicine });
    doc.text('Dose', itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine, tableTop, { width: colWidths.dose });
    doc.text('Route', itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine + colWidths.dose, tableTop, { width: colWidths.route });
    doc.text('Duration', itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine + colWidths.dose + colWidths.route, tableTop, { width: colWidths.duration });
    doc.text('Freq', itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine + colWidths.dose + colWidths.route + colWidths.duration, tableTop, { width: colWidths.frequency });
    doc.text('Start', itemX +  colWidths.date + colWidths.diagnosis + colWidths.medicine + colWidths.dose + colWidths.route + colWidths.duration + colWidths.frequency, tableTop, { width: colWidths.start });
    doc.text('End', itemX +  colWidths.date + colWidths.diagnosis + colWidths.medicine + colWidths.dose + colWidths.route + colWidths.duration + colWidths.frequency + colWidths.start, tableTop, { width: colWidths.end });

    doc.moveDown(0.5);
    doc.font('Helvetica');

    // If treatment record itself has medication fields, list them; otherwise use treatment_medicines rows
    if (medRows && medRows.length > 0) {
      for (const m of medRows) {
        const y = doc.y;
        doc.fontSize(9).text(new Date(tr.created_at || Date.now()).toLocaleDateString(), itemX, y, { width: colWidths.date });
        doc.text(tr.diagnosis || (tr.diagnosis_text || ''), itemX + colWidths.date, y, { width: colWidths.diagnosis });
        doc.text(m.medicine_name || m.medicine || '', itemX + colWidths.date + colWidths.diagnosis, y, { width: colWidths.medicine });
        doc.text(m.dose_amount ? `${m.dose_amount}${m.dose_unit || ''}` : (m.dose || ''), itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine, y, { width: colWidths.dose });
        doc.text(m.route || '', itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine + colWidths.dose, y, { width: colWidths.route });
        doc.text(m.duration_days ? m.duration_days.toString() : (m.duration || ''), itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine + colWidths.dose + colWidths.route, y, { width: colWidths.duration });
        doc.text(m.frequency || '', itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine + colWidths.dose + colWidths.route + colWidths.duration, y, { width: colWidths.frequency });
        doc.text(m.start_date ? new Date(m.start_date).toLocaleDateString() : '', itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine + colWidths.dose + colWidths.route + colWidths.duration + colWidths.frequency, y, { width: colWidths.start });
        doc.text(m.end_date ? new Date(m.end_date).toLocaleDateString() : '', itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine + colWidths.dose + colWidths.route + colWidths.duration + colWidths.frequency + colWidths.start, y, { width: colWidths.end });
        doc.moveDown(0.5);
      }
    } else {
      // fallback: show treatment record summary once
      const y = doc.y;
      doc.fontSize(9).text(new Date(tr.created_at || Date.now()).toLocaleDateString(), itemX, y, { width: colWidths.date });
      doc.text(tr.diagnosis || '', itemX + colWidths.date, y, { width: colWidths.diagnosis });
      doc.text(tr.medicine || '', itemX + colWidths.date + colWidths.diagnosis, y, { width: colWidths.medicine });
      doc.text(tr.dose_amount ? `${tr.dose_amount}${tr.dose_unit || ''}` : '', itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine, y, { width: colWidths.dose });
      doc.text(tr.route || '', itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine + colWidths.dose, y, { width: colWidths.route });
      doc.text(tr.duration_days ? tr.duration_days.toString() : '', itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine + colWidths.dose + colWidths.route, y, { width: colWidths.duration });
      doc.text(tr.frequency || '', itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine + colWidths.dose + colWidths.route + colWidths.duration, y, { width: colWidths.frequency });
      doc.text(tr.start_date ? new Date(tr.start_date).toLocaleDateString() : '', itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine + colWidths.dose + colWidths.route + colWidths.duration + colWidths.frequency, y, { width: colWidths.start });
      doc.text(tr.end_date ? new Date(tr.end_date).toLocaleDateString() : '', itemX + colWidths.date + colWidths.diagnosis + colWidths.medicine + colWidths.dose + colWidths.route + colWidths.duration + colWidths.frequency + colWidths.start, y, { width: colWidths.end });
      doc.moveDown(0.5);
    }

    doc.moveDown(0.5);

    // PRESCRIPTION TEXT
    doc.fontSize(12).font('Helvetica-Bold').text('Prescription');
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica').text(`Based on clinical diagnosis, the following medication is prescribed for the animal identified with tag ${tr.entity_name || tr.entity_id || ''}.`);
    doc.moveDown(0.3);
    if (tr.prescription) {
      doc.text(tr.prescription);
    }
    doc.moveDown(0.5);

    // WITHDRAWAL DETAILS
    doc.fontSize(12).font('Helvetica-Bold').text('Withdrawal Period');
    doc.moveDown(0.2);
    if (amu) {
      doc.fontSize(10).font('Helvetica');
      doc.text(`Predicted safe date: ${amu.predicted_safe_date ? new Date(amu.predicted_safe_date).toLocaleDateString() : 'N/A'}`);
      doc.text(`Withdrawal days: ${amu.withdrawal_days || 'N/A'}`);
      const riskCat = (amu.risk_category || '').toLowerCase();
      const badge = riskCat === 'safe' ? '🟢 SAFE' : (riskCat === 'borderline' ? '🟡 BORDERLINE' : '🔴 UNSAFE');
      doc.text(`Risk category: ${badge}`);
      doc.text(`Matrix: ${amu.matrix || 'N/A'}`);
    } else {
      doc.fontSize(10).text('No AMU/withdrawal data available');
    }
    doc.moveDown(0.5);

    // BODY MASS IMPACT NOTE
    doc.fontSize(12).font('Helvetica-Bold').text('Body Mass Impact Note');
    doc.fontSize(10).font('Helvetica');
    let biomassNote = 'N/A';
    if (medRows && medRows.length > 0 && tr.body_weight_kg) {
      let totalEstimate = 0;
      for (const m of medRows) {
        const dose = m.dose_amount || 0;
        const dur = m.duration_days || 1;
        totalEstimate += dose * dur * (tr.body_weight_kg || 0);
      }
      biomassNote = `${totalEstimate.toFixed(2)} (dose × duration × body weight estimate)`;
    }
    doc.text(`Estimated body mass impact: ${biomassNote}`);
    doc.moveDown(0.5);

    // REMARKS
    doc.fontSize(12).font('Helvetica-Bold').text('Remarks');
    doc.fontSize(10).font('Helvetica');
    doc.text(tr.remarks || tr.vet_remarks || '');
    doc.moveDown(1);

    // FOOTER and QR
    doc.fontSize(10).font('Helvetica-Oblique').text('Generated by FarmTrack – Digital AMU Management System', { align: 'center' });

    // Generate QR code linking to animal tracking page (optional)
    const qrData = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/animals/${tr.entity_id}`;
    try {
      const qrImageDataUrl = await QRCode.toDataURL(qrData);
      const base64Data = qrImageDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(base64Data, 'base64');
      doc.image(qrBuffer, doc.page.width - 120, doc.page.height - 140, { width: 80 });
    } catch (err) {
      // ignore QR errors
    }

    doc.end();

    // Wait for write stream to finish, then respond with download URL
    writeStream.on('finish', async () => {
      // Optionally save to lab_test_reports.certificate_url if treatment linked to a lab report
      try {
        await db.execute('UPDATE lab_test_reports SET certificate_url = ? WHERE treatment_id = ?', [ `/uploads/prescriptions/${filename}`, treatmentId ]);
      } catch (err) {
        // ignore update errors
      }

      // Stream file to client for immediate download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${prescriptionNumber}.pdf"`);
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    });

    writeStream.on('error', (err) => {
      console.error('Write stream error:', err);
      res.status(500).json({ error: 'Failed to generate PDF' });
    });

  } catch (error) {
    console.error('Prescription generation error:', error);
    res.status(500).json({ error: 'Failed to generate prescription PDF' });
  }
});

module.exports = router;
