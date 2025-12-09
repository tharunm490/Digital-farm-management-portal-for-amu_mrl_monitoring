const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const Notification = require('./Notification');

// Load dosage reference JSON
const dosageRefPath = path.join(__dirname, '../data/dosage_reference_full_extended_with_mrl.json');
let dosageRef = null;
try {
    dosageRef = JSON.parse(fs.readFileSync(dosageRefPath, 'utf8'));
} catch (e) {
    console.warn('Failed to load dosage reference JSON:', e.message);
}

function intToDate(intDate) {
  if (!intDate) return null;
  const dateStr = intDate.toString();
  if (dateStr.length !== 8) return null;
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return `${year}-${month}-${day}`;
}

function getMrlStatus(predicted_mrl, safe_max, borderline_max, unsafe_above) {
    if (safe_max === null || safe_max === undefined) {
        return { status: 'Safe', color: 'green' };
    }
    if (predicted_mrl <= safe_max) {
        return { status: 'Safe', color: 'green' };
    }
    if (predicted_mrl <= borderline_max) {
        return { status: 'Borderline', color: 'yellow' };
    }
    return { status: 'Unsafe', color: 'red' };
}

class AMU {
  // Helper method to find the best laboratory for sample assignment
  // Priority: Same taluk > Same district > Same state > Any lab
  static async findAssignedLab(state, district, taluk) {
    try {
      // Priority 1: Same taluk
      const [talukLabs] = await db.execute(
        'SELECT lab_id FROM laboratories WHERE state = ? AND district = ? AND taluk = ? LIMIT 1',
        [state, district, taluk]
      );
      if (talukLabs.length > 0) {
        console.log(`✅ Lab found in same taluk: ${talukLabs[0].lab_id}`);
        return talukLabs[0].lab_id;
      }

      // Priority 2: Same district
      const [districtLabs] = await db.execute(
        'SELECT lab_id FROM laboratories WHERE state = ? AND district = ? LIMIT 1',
        [state, district]
      );
      if (districtLabs.length > 0) {
        console.log(`✅ Lab found in same district: ${districtLabs[0].lab_id}`);
        return districtLabs[0].lab_id;
      }

      // Priority 3: Same state
      const [stateLabs] = await db.execute(
        'SELECT lab_id FROM laboratories WHERE state = ? LIMIT 1',
        [state]
      );
      if (stateLabs.length > 0) {
        console.log(`✅ Lab found in same state: ${stateLabs[0].lab_id}`);
        return stateLabs[0].lab_id;
      }

      // Priority 4: Any lab
      const [anyLabs] = await db.execute('SELECT lab_id FROM laboratories LIMIT 1');
      if (anyLabs.length > 0) {
        console.log(`✅ Lab found (any): ${anyLabs[0].lab_id}`);
        return anyLabs[0].lab_id;
      }

      console.warn('⚠️ No laboratories found in the system');
      return null;
    } catch (err) {
      console.error('Error finding assigned lab:', err.message);
      return null;
    }
  }

  // Create new AMU record (auto-filled from treatment)
  static async create(amuData) {
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
      overdosage,
      risk_category,
      worst_tissue,
      risk_percent
    } = amuData;

    // Override predicted_withdrawal_days for vaccine and vitamin categories
    let effectiveWithdrawalDays = Math.max(0, predicted_withdrawal_days || 0);
    if (category_type === 'vaccine' || category_type === 'vitamin') {
      effectiveWithdrawalDays = 0;
    }

    // Calculate safe_date
    let safe_date = null;
    if (end_date) {
      const endDateStr = intToDate(end_date);
      if (endDateStr) {
        const endDate = new Date(endDateStr);
        if (effectiveWithdrawalDays > 0) {
          endDate.setDate(endDate.getDate() + effectiveWithdrawalDays);
        }
        safe_date = endDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      }
    }

    // Clamp risk_percent to prevent database range errors
    let clampedRiskPercent = risk_percent;
    if (clampedRiskPercent !== null && clampedRiskPercent !== undefined) {
      clampedRiskPercent = Math.max(0, Math.min(999.99, parseFloat(clampedRiskPercent)));
    }

    const query = `
      INSERT INTO amu_records (
        treatment_id, entity_id, farm_id, user_id,
        species, medication_type, matrix,
        medicine, active_ingredient, category_type,
        reason, cause,
        route, dose_amount, dose_unit,
        frequency_per_day, duration_days,
        start_date, end_date,
        predicted_mrl, predicted_withdrawal_days, safe_date, overdosage, risk_category, worst_tissue, risk_percent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
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
      effectiveWithdrawalDays,  // Use the overridden value
      safe_date,
      overdosage,
      risk_category,
      worst_tissue,
      clampedRiskPercent
    ]);

    const amuId = result.insertId;

    // Get the farmer's user_id for notifications (owner of the farm)
    let farmerUserId = user_id; // Default to the user who created the record
    try {
      const [farmRows] = await db.query(`
        SELECT u.user_id as farmer_user_id
        FROM farms f
        JOIN farmers fr ON f.farmer_id = fr.farmer_id
        JOIN users u ON fr.user_id = u.user_id
        WHERE f.farm_id = ?
      `, [farm_id]);
      if (farmRows.length > 0) {
        farmerUserId = farmRows[0].farmer_user_id;
      }
    } catch (err) {
      console.warn('Could not get farmer user_id for notifications:', err.message);
    }

    // Create notification if unsafe - send to farmer
    if (risk_category === 'UNSAFE') {
      await Notification.create({
        user_id: farmerUserId,
        type: 'alert',
        subtype: 'unsafe_mrl',
        message: `Unsafe condition detected for ${medicine} in ${species}. Risk category: ${risk_category}`,
        entity_id,
        treatment_id,
        amu_id: amuId
      });

      // Also notify veterinarian (if different from farmer)
      const VetFarmMapping = require('./VetFarmMapping');
      const vetMapping = await VetFarmMapping.getVetForFarm(farm_id);
      if (vetMapping && vetMapping.user_id !== farmerUserId) {
        await Notification.create({
          user_id: vetMapping.user_id,
          type: 'alert',
          subtype: 'unsafe_mrl',
          message: `Unsafe condition detected for ${medicine} in ${species} on farm ${vetMapping.farm_name}. Risk category: ${risk_category}`,
          entity_id,
          treatment_id,
          amu_id: amuId
        });
      }
    }

    // Create notification if overdosage - send to farmer
    if (overdosage) {
      await Notification.create({
        user_id: farmerUserId,
        type: 'alert',
        subtype: 'overdosage',
        message: `Overdosage detected for ${medicine} in ${species}. Please review the treatment.`,
        entity_id,
        treatment_id,
        amu_id: amuId
      });

      // Also notify veterinarian (if different from farmer)
      const VetFarmMapping = require('./VetFarmMapping');
      const vetMapping = await VetFarmMapping.getVetForFarm(farm_id);
      if (vetMapping && vetMapping.user_id !== farmerUserId) {
        await Notification.create({
          user_id: vetMapping.user_id,
          type: 'alert',
          subtype: 'overdosage',
          message: `Overdosage detected for ${medicine} in ${species} on farm ${vetMapping.farm_name}. Please review the treatment.`,
          entity_id,
          treatment_id,
          amu_id: amuId
        });
      }
    }

    // ========================================
    // 🔬 STEP 1: CREATE SAMPLE REQUEST
    // ========================================
    // After AMU record is created with safe_date, automatically create a sample request
    // with the best-assigned laboratory
    if (safe_date) {
      try {
        console.log(`\n📋 STEP 1: Creating sample request for AMU ID ${amuId}`);
        console.log(`   safe_date: ${safe_date}`);
        
        // Get farm location details for lab assignment
        const [farmDetails] = await db.execute(
          'SELECT f.state, f.district, f.taluk, fr.farmer_id FROM farms f JOIN farmers fr ON f.farmer_id = fr.farmer_id WHERE f.farm_id = ?',
          [farm_id]
        );
        
        if (!farmDetails || farmDetails.length === 0) {
          console.warn('⚠️ Could not find farm details for sample request');
        } else {
          const { state, district, taluk, farmer_id } = farmDetails[0];
          
          // Find the best laboratory
          const assigned_lab_id = await AMU.findAssignedLab(state, district, taluk);
          
          if (assigned_lab_id) {
            // Create sample request
            const sampleRequestQuery = `
              INSERT INTO sample_requests (treatment_id, farmer_id, entity_id, assigned_lab_id, safe_date, status)
              VALUES (?, ?, ?, ?, ?, 'requested')
            `;
            
            const [sampleResult] = await db.execute(sampleRequestQuery, [
              treatment_id,
              farmer_id,
              entity_id,
              assigned_lab_id
            ]);
            
            const sample_request_id = sampleResult.insertId;
            console.log(`✅ Sample request created successfully!`);
            console.log(`   sample_request_id: ${sample_request_id}`);
            console.log(`   assigned_lab_id: ${assigned_lab_id}`);
            console.log(`   status: requested`);
            
            // Create notification for farmer
            await Notification.create({
              user_id: farmerUserId,
              type: 'info',
              subtype: 'sample_request_created',
              message: `Lab assigned for sample collection. Your sample will be ready for collection on ${safe_date}`,
              entity_id,
              treatment_id,
              amu_id: amuId
            });
            console.log(`📧 Notification sent to farmer about sample request`);
          } else {
            console.warn('⚠️ No laboratory available for sample request assignment');
          }
        }
      } catch (sampleErr) {
        console.error('❌ Error creating sample request:', sampleErr.message);
        // Don't throw - sample request creation is optional, AMU record already created
      }
    }

    return result.insertId;
  }

  // Get all AMU records for a treatment
  static async getByTreatment(treatmentId) {
    const query = 'SELECT * FROM amu_records WHERE treatment_id = ? ORDER BY created_at DESC';
    const [rows] = await db.execute(query, [treatmentId]);
    return rows;
  }

  // Get single AMU record by ID
  static async getById(amuId) {
    const query = `
      SELECT a.*, t.medicine as treatment_medicine, e.species, e.tag_id, e.batch_name, f.farm_name
      FROM amu_records a
      JOIN treatment_records t ON a.treatment_id = t.treatment_id
      JOIN animals_or_batches e ON a.entity_id = e.entity_id
      JOIN farms f ON a.farm_id = f.farm_id
      WHERE a.amu_id = ?
    `;
    const [rows] = await db.execute(query, [amuId]);
    return rows[0];
  }

  // Get all AMU records for an entity
  static async getByEntity(entityId) {
    const query = `
      SELECT a.*, t.start_date as treatment_start, t.medicine as treatment_medicine,
             e.entity_type, e.tag_id, e.batch_name, e.species, f.farm_name
      FROM amu_records a
      JOIN treatment_records t ON a.treatment_id = t.treatment_id
      JOIN animals_or_batches e ON a.entity_id = e.entity_id
      JOIN farms f ON a.farm_id = f.farm_id
      WHERE a.entity_id = ?
      ORDER BY a.start_date DESC
    `;
    const [rows] = await db.execute(query, [entityId]);
    // Add status and MRL limits to each record
    return rows.map(row => {
      const status = row.risk_category ? row.risk_category.charAt(0).toUpperCase() + row.risk_category.slice(1) : 'Unknown';

      // Get MRL limits from dosage reference
      let safe_max = null, borderline_max = null, unsafe_above = null;
      if (dosageRef && dosageRef[row.species] && dosageRef[row.species][row.medication_type] && dosageRef[row.species][row.medication_type][row.medicine]) {
        const medData = dosageRef[row.species][row.medication_type][row.medicine];
        if (medData.mrl_by_matrix && medData.mrl_by_matrix[row.matrix]) {
          const mrl = medData.mrl_by_matrix[row.matrix].mrl_ug_per_kg;
          safe_max = mrl.safe;
          borderline_max = mrl.borderline;
          unsafe_above = mrl.unsafe;
        }
      }

      return { ...row, status, safe_max, borderline_max, unsafe_above };
    });
  }

  // Get all AMU records for a farmer
  static async getByFarmer(farmerId) {
    const query = `
      SELECT a.*, t.start_date as treatment_start, t.medicine as treatment_medicine,
             e.entity_type, e.tag_id, e.batch_name, e.species, f.farm_name
      FROM amu_records a
      JOIN treatment_records t ON a.treatment_id = t.treatment_id
      JOIN animals_or_batches e ON a.entity_id = e.entity_id
      JOIN farms f ON a.farm_id = f.farm_id
      WHERE f.farmer_id = ?
      ORDER BY a.start_date DESC
    `;
    const [rows] = await db.execute(query, [farmerId]);
    // Add status and MRL limits to each record
    const TissueResult = require('./TissueResult');
    return await Promise.all(rows.map(async row => {
      // Use risk_category for status, capitalize it
      const status = (row.risk_category && row.risk_category !== '0' && row.risk_category !== 0) ? row.risk_category.charAt(0).toUpperCase() + row.risk_category.slice(1) : 'Unknown';

      // Get MRL limits from dosage reference
      let safe_max = null, borderline_max = null, unsafe_above = null;
      if (dosageRef && dosageRef[row.species] && dosageRef[row.species][row.medication_type] && dosageRef[row.species][row.medication_type][row.medicine]) {
        const medData = dosageRef[row.species][row.medication_type][row.medicine];
        if (medData.mrl_by_matrix && medData.mrl_by_matrix[row.matrix]) {
          const mrl = medData.mrl_by_matrix[row.matrix].mrl_ug_per_kg;
          safe_max = mrl.safe;
          borderline_max = mrl.borderline;
          unsafe_above = mrl.unsafe;
        }
      }

      // Get tissue results if matrix is meat
      let tissue_results = null;
      if (row.matrix === 'meat') {
        const tissues = await TissueResult.getByAmuId(row.amu_id);
        if (tissues.length > 0) {
          tissue_results = {
            tissues: {},
            worst_tissue: row.worst_tissue,
            overall_risk_category: row.risk_category,
            predicted_mrl: row.predicted_mrl
          };
          tissues.forEach(t => {
            tissue_results.tissues[t.tissue] = {
              predicted_mrl: t.predicted_mrl,
              base_mrl: t.base_mrl,
              risk_percent: t.risk_percent,
              risk_category: t.risk_category
            };
          });
        }
      }

      return { ...row, status, safe_max, borderline_max, unsafe_above, tissue_results };
    }));
  }

  // Get all AMU records for a vet (mapped farms)
  static async getByVet(vetId) {
    const query = `
      SELECT a.*, t.start_date as treatment_start, t.medicine as treatment_medicine,
             e.entity_type, e.tag_id, e.batch_name, e.species, f.farm_name
      FROM amu_records a
      JOIN treatment_records t ON a.treatment_id = t.treatment_id
      JOIN animals_or_batches e ON a.entity_id = e.entity_id
      JOIN farms f ON a.farm_id = f.farm_id
      JOIN vet_farm_mapping vfm ON f.farm_id = vfm.farm_id
      WHERE vfm.vet_id = ?
      ORDER BY a.start_date DESC
    `;
    const [rows] = await db.execute(query, [vetId]);
    // Add status and MRL limits to each record
    const TissueResult = require('./TissueResult');
    return await Promise.all(rows.map(async row => {
      // Use risk_category for status, capitalize it
      const status = (row.risk_category && row.risk_category !== '0' && row.risk_category !== 0) ? row.risk_category.charAt(0).toUpperCase() + row.risk_category.slice(1) : 'Unknown';

      // Get MRL limits from dosage reference
      let safe_max = null, borderline_max = null, unsafe_above = null;
      if (dosageRef && dosageRef[row.species] && dosageRef[row.species][row.medication_type] && dosageRef[row.species][row.medication_type][row.medicine]) {
        const medData = dosageRef[row.species][row.medication_type][row.medicine];
        if (medData.mrl_by_matrix && medData.mrl_by_matrix[row.matrix]) {
          const mrl = medData.mrl_by_matrix[row.matrix].mrl_ug_per_kg;
          safe_max = mrl.safe;
          borderline_max = mrl.borderline;
          unsafe_above = mrl.unsafe;
        }
      }

      // Get tissue results if matrix is meat
      let tissue_results = null;
      if (row.matrix === 'meat') {
        const tissues = await TissueResult.getByAmuId(row.amu_id);
        if (tissues.length > 0) {
          tissue_results = {
            tissues: {},
            worst_tissue: row.worst_tissue,
            overall_risk_category: row.risk_category,
            predicted_mrl: row.predicted_mrl
          };
          tissues.forEach(t => {
            tissue_results.tissues[t.tissue] = {
              predicted_mrl: t.predicted_mrl,
              base_mrl: t.base_mrl,
              risk_percent: t.risk_percent,
              risk_category: t.risk_category
            };
          });
        }
      }

      return { ...row, status, safe_max, borderline_max, unsafe_above, tissue_results };
    }));
  }

  // Get AMU records with active withdrawal periods
  static async getActiveWithdrawals(farmerId) {
    const query = `
      SELECT a.*, t.start_date as treatment_start, e.entity_type, e.tag_id, e.batch_name, e.species,
             DATEDIFF(DATE_ADD(a.end_date, INTERVAL a.predicted_withdrawal_days DAY), CURDATE()) as days_remaining
      FROM amu_records a
      JOIN treatment_records t ON a.treatment_id = t.treatment_id
      JOIN animals_or_batches e ON a.entity_id = e.entity_id
      JOIN farms f ON a.farm_id = f.farm_id
      WHERE f.farmer_id = ?
        AND a.predicted_withdrawal_days IS NOT NULL
        AND CURDATE() < DATE_ADD(a.end_date, INTERVAL a.predicted_withdrawal_days DAY)
      ORDER BY days_remaining ASC
    `;
    const [rows] = await db.execute(query, [farmerId]);
    return rows;
  }

  // Update AMU record
  static async update(amuId, updateData) {
    // Clone updateData to avoid modifying the original
    const clampedData = { ...updateData };
    
    // Clamp risk_percent if present
    if (clampedData.risk_percent !== null && clampedData.risk_percent !== undefined) {
      clampedData.risk_percent = Math.max(0, Math.min(999.99, parseFloat(clampedData.risk_percent)));
    }
    
    const fields = Object.keys(clampedData);
    const values = Object.values(clampedData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE amu_records SET ${setClause} WHERE amu_id = ?`;
    values.push(amuId);
    await db.execute(query, values);
  }
}

module.exports = AMU;
