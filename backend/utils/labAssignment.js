const Laboratory = require('../models/Laboratory');
const SampleRequest = require('../models/SampleRequest');
const Notification = require('../models/Notification');
const db = require('../config/database');

/**
 * Auto-assign nearest laboratory to a treatment
 * Uses geographic priority: Taluk > District > State > Any
 * Creates sample request and notifies the assigned laboratory
 */
async function autoAssignLaboratory(treatmentData) {
  try {
    const {
      treatment_id,
      farmer_id,
      entity_id,
      safe_date,
      entity_location // { taluk, district, state }
    } = treatmentData;

    if (!entity_location || !entity_location.state) {
      console.warn('⚠️ Cannot auto-assign lab: missing location data');
      return null;
    }

    console.log(`🔍 Finding nearest lab for location:`, entity_location);

    // Find nearest laboratory
    const nearestLab = await Laboratory.findNearestByLocation(entity_location);

    if (!nearestLab) {
      console.warn('⚠️ No laboratory found for assignment');
      return null;
    }

    console.log(`✅ Found nearest lab: ${nearestLab.lab_name} (ID: ${nearestLab.lab_id})`);

    // Create sample request
    const sampleRequestId = await SampleRequest.create({
      treatment_id,
      farmer_id,
      entity_id,
      assigned_lab_id: nearestLab.lab_id,
      safe_date,
      status: 'requested'
    });

    console.log(`✅ Sample request created (ID: ${sampleRequestId})`);

    // Get lab user to send notification
    const [labUser] = await db.query(
      'SELECT user_id FROM laboratories WHERE lab_id = ?',
      [nearestLab.lab_id]
    );

    if (labUser && labUser[0]) {
      // Send notification to laboratory
      await Notification.create({
        user_id: labUser[0].user_id,
        type: 'alert',
        subtype: 'sample_request',
        message: `Withdrawal completed. Sample collection required for Entity #${entity_id}. Safe date: ${safe_date}`,
        entity_id,
        treatment_id
      });

      console.log(`✅ Notification sent to laboratory user (ID: ${labUser[0].user_id})`);
    }

    return {
      sample_request_id: sampleRequestId,
      lab_id: nearestLab.lab_id,
      lab_name: nearestLab.lab_name,
      safe_date
    };
  } catch (error) {
    console.error('❌ Error in autoAssignLaboratory:', error);
    return null;
  }
}

/**
 * Get laboratory assignment details for a sample request
 */
async function getLabAssignmentDetails(sample_request_id) {
  try {
    const [result] = await db.query(
      `SELECT 
        sr.*, 
        l.lab_name, l.phone as lab_phone, l.email as lab_email, l.address as lab_address,
        f.farmer_name,
        e.entity_name, e.tag_id,
        t.treatment_medicine, t.dosage
       FROM sample_requests sr
       JOIN laboratories l ON sr.assigned_lab_id = l.lab_id
       JOIN farmers f ON sr.farmer_id = f.farmer_id
       JOIN animals_or_batches e ON sr.entity_id = e.entity_id
       JOIN treatment_records t ON sr.treatment_id = t.treatment_id
       WHERE sr.sample_request_id = ?`,
      [sample_request_id]
    );
    return result[0] || null;
  } catch (error) {
    console.error('Error fetching lab assignment details:', error);
    return null;
  }
}

module.exports = {
  autoAssignLaboratory,
  getLabAssignmentDetails
};
