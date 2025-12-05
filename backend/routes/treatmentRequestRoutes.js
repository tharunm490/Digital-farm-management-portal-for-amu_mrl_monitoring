const express = require('express');
const router = express.Router();
const TreatmentRequest = require('../models/TreatmentRequest');
const { Farmer, Veterinarian } = require('../models/User');
const VetFarmMapping = require('../models/VetFarmMapping');
const { authMiddleware, farmerOnly, veterinarianOnly } = require('../middleware/auth');
const db = require('../config/database');

// Get treatment requests (filtered by role)
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'farmer') {
      const farmer = await Farmer.getByUserId(req.user.user_id);
      if (!farmer) return res.status(404).json({ error: 'Farmer profile not found' });
      
      const requests = await TreatmentRequest.getByFarmer(farmer.farmer_id);
      res.json(requests);
    } else if (req.user.role === 'veterinarian') {
      const veterinarian = await Veterinarian.getByUserId(req.user.user_id);
      if (!veterinarian) return res.status(404).json({ error: 'Veterinarian profile not found' });
      
      const requests = await TreatmentRequest.getByVet(veterinarian.vet_id);
      res.json(requests);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch treatment requests' });
  }
});

// Get treatment requests by farm
router.get('/farm/:farmId', authMiddleware, async (req, res) => {
  try {
    const { farmId } = req.params;
    const requests = await TreatmentRequest.getByFarm(farmId);
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch treatment requests for farm' });
  }
});

// Create treatment request (farmers only)
router.post('/', authMiddleware, farmerOnly, async (req, res) => {
  try {
    const { entity_id, symptoms } = req.body;
    
    // Get farmer and entity details
    const farmer = await Farmer.getByUserId(req.user.user_id);
    if (!farmer) return res.status(404).json({ error: 'Farmer profile not found' });
    
    // Get entity and farm details (location is in users table)
    const [entities] = await db.query(`
      SELECT a.*, f.farm_id, f.farm_name, u.state, u.district, u.taluk FROM animals_or_batches a
      JOIN farms f ON a.farm_id = f.farm_id
      JOIN farmers fr ON f.farmer_id = fr.farmer_id
      JOIN users u ON fr.user_id = u.user_id
      WHERE a.entity_id = ? AND f.farmer_id = ?
    `, [entity_id, farmer.farmer_id]);
    
    if (entities.length === 0) {
      return res.status(404).json({ error: 'Animal/batch not found or access denied' });
    }
    
    const entity = entities[0];
    
    // Check minimum gap rule - no new request during active treatment duration
    const [existingTreatments] = await db.query(`
      SELECT t.end_date 
      FROM treatment_records t
      WHERE t.entity_id = ? 
        AND t.end_date IS NOT NULL 
        AND t.end_date >= CURDATE()
      ORDER BY t.end_date DESC 
      LIMIT 1
    `, [entity_id]);

    if (existingTreatments.length > 0) {
      return res.status(400).json({ 
        error: `This animal/batch is currently undergoing treatment until ${existingTreatments[0].end_date}. New treatment request not allowed during active treatment period.` 
      });
    }

    // Check if species requires vet
    if (['cattle', 'goat', 'sheep', 'pig'].includes(entity.species)) {
      // Find vets by exact location matching (state, district, taluk)
      let matchedVets = await VetFarmMapping.getVetsByLocation(entity.state, entity.district, entity.taluk);
      
      // If no vets match exact taluk, use any default vet from database
      if (matchedVets.length === 0) {
        const [allVets] = await db.query('SELECT v.*, u.display_name, u.email, u.user_id FROM veterinarians v JOIN users u ON v.user_id = u.user_id LIMIT 1');
        matchedVets = allVets;
      }
      
      if (matchedVets.length === 0) {
        return res.status(400).json({ error: 'No veterinarians available' });
      }
      
      const requestIds = [];
      const Notification = require('../models/Notification');
      
      // Create treatment request for each matched vet
      for (const vet of matchedVets) {
        const requestData = {
          farm_id: entity.farm_id,
          entity_id: entity_id,
          farmer_id: farmer.farmer_id,
          vet_id: vet.vet_id,
          species: entity.species,
          symptoms: symptoms
        };
        
        const requestId = await TreatmentRequest.create(requestData);
        requestIds.push(requestId);
        
        // Send notification to vet (don't fail the request if notification fails)
        try {
          await Notification.create({
            user_id: vet.user_id,
            type: 'alert',
            subtype: 'request',
            message: `New treatment request from Farm ${entity.farm_name} for ${entity.species} ${entity.tag_id || entity.batch_name}. Symptoms: ${symptoms}`,
            entity_id: entity_id
          });
        } catch (notificationError) {
          console.warn('Failed to send notification to vet:', notificationError);
          // Continue with request creation even if notification fails
        }
      }
      
      res.status(201).json({ 
        ids: requestIds, 
        message: `Treatment request submitted to ${matchedVets.length} veterinarian(s) successfully` 
      });
    } else {
      res.status(400).json({ error: 'Treatment requests are only for mammals' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create treatment request' });
  }
});

// Approve request and create treatment (vets only)
router.post('/:id/approve-and-treat', authMiddleware, veterinarianOnly, async (req, res) => {
  try {
    const veterinarian = await Veterinarian.getByUserId(req.user.user_id);
    if (!veterinarian) return res.status(404).json({ error: 'Veterinarian profile not found' });
    
    // Verify request belongs to vet
    const request = await TreatmentRequest.getById(req.params.id);
    if (!request || request.vet_id !== veterinarian.vet_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }
    
    // Update this request status to approved
    await db.query(
      'UPDATE treatment_requests SET status = ?, vet_id = ? WHERE request_id = ?',
      ['approved', veterinarian.vet_id, req.params.id]
    );
    
    // Mark all other requests for the same entity/farm combination as approved by this vet
    await db.query(`
      UPDATE treatment_requests 
      SET status = 'approved', vet_id = ? 
      WHERE entity_id = ? AND farm_id = ? AND request_id != ? AND status = 'pending'
    `, [veterinarian.vet_id, request.entity_id, request.farm_id, req.params.id]);
    
    // Send notifications to other vets that this request has been handled
    const Notification = require('../models/Notification');
    const [otherRequests] = await db.query(`
      SELECT tr.*, v.user_id as vet_user_id 
      FROM treatment_requests tr 
      JOIN veterinarians v ON tr.vet_id = v.vet_id 
      WHERE tr.entity_id = ? AND tr.farm_id = ? AND tr.request_id != ? AND tr.status = 'approved' AND tr.vet_id = ?
    `, [request.entity_id, request.farm_id, req.params.id, veterinarian.vet_id]);
    
    for (const otherReq of otherRequests) {
      try {
        await Notification.create({
          user_id: otherReq.vet_user_id,
          type: 'alert',
          subtype: 'request',
          message: `Treatment request for ${request.species} ${request.tag_id || request.batch_name} has already been treated by Dr. ${veterinarian.vet_name}`,
          entity_id: request.entity_id
        });
      } catch (notificationError) {
        console.warn('Failed to send notification to other vet:', notificationError);
        // Continue even if notification fails
      }
    }
    
    res.status(200).json({ 
      message: 'Request approved successfully. Other veterinarians have been notified.' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to approve request' });
  }
});

// Get single treatment request by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const request = await TreatmentRequest.getById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json(request);
  } catch (error) {
    console.error('Failed to fetch treatment request:', error);
    res.status(500).json({ error: 'Failed to fetch treatment request' });
  }
});

// Update request status
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const result = await TreatmentRequest.updateStatus(req.params.id, status);
    if (result) {
      res.json({ message: 'Request status updated successfully' });
    } else {
      res.status(404).json({ error: 'Request not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update request status' });
  }
});

module.exports = router;