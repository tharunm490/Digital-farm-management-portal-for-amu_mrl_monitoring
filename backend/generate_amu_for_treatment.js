const Treatment = require('./models/Treatment');
const AMU = require('./models/AMU');
const TissueResult = require('./models/TissueResult');
const Notification = require('./models/Notification');
const VetFarmMapping = require('./models/VetFarmMapping');
const db = require('./config/database');
const { predictTissueMrl } = require('./utils/amuTissueService');

async function run() {
  try {
    const treatmentId = 1;

    const treatment = await Treatment.getById(treatmentId);
    if (!treatment) {
      console.error('Treatment not found:', treatmentId);
      return process.exit(1);
    }

    // Determine normalized category similar to Treatment.create
    const categoryMap = {
      'Anti Inflammatory': 'anti-inflammatory',
      'Antibiotic': 'antibiotic',
      'Anticoccidial': 'anticoccidial',
      'Antiparasitic': 'antiparasitic',
      'Hormonal': 'hormonal',
      'NSAID': 'nsaid'
    };
    const normalizedCategory = categoryMap[treatment.medication_type] || (treatment.medication_type || '').toLowerCase().replace(/\s+/g, '-');

    const predictions = Treatment.calculateMRLAndWithdrawal(
      treatment.species,
      normalizedCategory,
      treatment.medicine,
      treatment.dose_amount,
      treatment.duration_days,
      treatment.frequency_per_day,
      treatment.matrix
    );

    const amuId = await Treatment.createAMURecord(treatmentId, predictions, treatment.end_date);
    console.log('Created AMU record id:', amuId);

    // If matrix is meat, generate tissue predictions and insert
    if (treatment.matrix === 'meat') {
      const tissueResults = predictTissueMrl(
        treatment.species,
        normalizedCategory,
        treatment.medicine,
        treatment.dose_amount,
        treatment.dose_unit,
        treatment.duration_days,
        treatment.matrix,
        treatment.end_date,
        treatment.end_date,
        treatment.frequency_per_day
      );

      if (tissueResults && tissueResults.tissues) {
        for (const [tissue, data] of Object.entries(tissueResults.tissues)) {
          await TissueResult.create({
            amu_id: amuId,
            tissue,
            predicted_mrl: data.predicted_mrl,
            base_mrl: data.base_mrl,
            risk_percent: data.risk_percent,
            risk_category: data.risk_category
          });
        }

        // Update AMU with worst tissue info
        const worst = tissueResults.worst_tissue;
        const worstRiskPercent = tissueResults.tissues[worst] ? tissueResults.tissues[worst].risk_percent : null;
        await AMU.update(amuId, {
          worst_tissue: worst,
          risk_category: tissueResults.overall_risk_category,
          predicted_mrl: tissueResults.predicted_mrl,
          predicted_withdrawal_days: tissueResults.predicted_withdrawal_days,
          safe_date: tissueResults.safe_date,
          overdosage: tissueResults.overdosage ? 1 : 0,
          risk_percent: worstRiskPercent
        });

        // Create notifications similar to Treatment.create
        if (tissueResults.overall_risk_category === 'unsafe' || tissueResults.overdosage) {
          const farmId = treatment.farm_id;
          // Try to get farmer user id
          let farmerUserId = treatment.user_id;
          try {
            const [rows] = await db.query(`SELECT u.user_id as farmer_user_id FROM farms f JOIN farmers fr ON f.farmer_id = fr.farmer_id JOIN users u ON fr.user_id = u.user_id WHERE f.farm_id = ?`, [farmId]);
            if (rows && rows.length > 0) farmerUserId = rows[0].farmer_user_id;
          } catch (e) {
            console.warn('Could not fetch farmer user id:', e.message);
          }

          // Notification for farmer
          await Notification.create({
            user_id: farmerUserId,
            type: 'alert',
            subtype: tissueResults.overdosage ? 'overdosage' : 'unsafe_mrl',
            message: tissueResults.overdosage ? `Overdosage alert for ${treatment.medicine}` : `Unsafe residual limit for ${treatment.medicine}`,
            entity_id: treatment.entity_id,
            treatment_id: treatmentId,
            amu_id: amuId
          });

          // Notification for vet (via vet-farm mapping)
          const mapping = await VetFarmMapping.getVetForFarm(farmId);
          if (mapping && mapping.user_id) {
            await Notification.create({
              user_id: mapping.user_id,
              type: 'alert',
              subtype: tissueResults.overdosage ? 'overdosage' : 'unsafe_mrl',
              message: `Alert for farm ${mapping.farm_name}: ${tissueResults.overall_risk_category}`,
              entity_id: treatment.entity_id,
              treatment_id: treatmentId,
              amu_id: amuId
            });
          }
        }
      }
    }

    console.log('AMU generation completed for treatment:', treatmentId);
  } catch (e) {
    console.error('ERROR', e && e.message ? e.message : e);
  } finally {
    try { await db.end(); } catch (_) {}
    process.exit();
  }
}

run();
