const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { QR, TamperProof } = require('../models/QR');
const { authMiddleware, farmerOnly } = require('../middleware/auth');
const Entity = require('../models/Entity');
const Farm = require('../models/Farm');
const { Farmer } = require('../models/User');

// POST /api/qr/generate/:entity_id - Generate QR code for an entity (animal or batch)
router.post('/generate/:entity_id', authMiddleware, farmerOnly, async (req, res) => {
  try {
    const { entity_id } = req.params;
    
    // Verify entity exists
    const entity = await Entity.getById(entity_id);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    // Verify ownership
    const farm = await Farm.getById(entity.farm_id);
    const farmer = await Farmer.getByUserId(req.user.user_id);
    
    if (!farm || farm.farmer_id !== farmer.farmer_id) {
      return res.status(403).json({ error: 'Access denied to this entity' });
    }
    
    // Check if QR already exists
    let qrRecord = await QR.getByEntityId(entity_id);
    
    // Generate QR URL (always use localhost for development)
    const qrUrl = `http://localhost:5000/api/verify/${entity_id}`;
    
    // Generate QR code as Base64 image
    const qrImage = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2
    });
    
    const qrHash = require('crypto').createHash('sha256').update(qrUrl).digest('hex');
    
    if (qrRecord) {
      // Update existing QR record
      await QR.update(entity_id, qrImage, qrUrl);
    } else {
      // Create new QR record
      await QR.create({ entity_id, qr_payload: qrUrl });
    }
    
    // Create tamper-proof log
    await TamperProof.create({
      entity_type: 'qr',
      entity_id,
      record_hash: qrHash
    });
    
    res.json({
      entity_id: parseInt(entity_id),
      entity_type: entity.entity_type,
      tag_id: entity.tag_id,
      batch_name: entity.batch_name,
      species: entity.species,
      breed: entity.breed,
      farm_name: entity.farm_name,
      matrix: entity.matrix,
      qr_code: qrImage,
      qr_hash: qrHash,
      verification_url: qrUrl,
      message: 'QR code generated successfully'
    });
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code', details: error.message });
  }
});

// GET /api/qr/:entity_id - Get existing QR code
router.get('/:entity_id', authMiddleware, async (req, res) => {
  try {
    const { entity_id } = req.params;
    const qrRecord = await QR.getByEntityId(entity_id);
    
    if (!qrRecord) {
      return res.status(404).json({ error: 'QR code not found for this entity' });
    }
    
    res.json(qrRecord);
  } catch (error) {
    console.error('Error fetching QR code:', error);
    res.status(500).json({ error: 'Failed to fetch QR code' });
  }
});

module.exports = router;
