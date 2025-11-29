// amuTissueService.js - Backend logic for tissue-wise MRL predictions
const fs = require('fs');
const path = require('path');

// Load updated MRL data
const mrlDataPath = path.join(__dirname, '../data/dosage_reference_full_extended_with_mrl.json');
let mrlData = {};
try {
  const data = fs.readFileSync(mrlDataPath, 'utf8');
  mrlData = JSON.parse(data);
} catch (err) {
  console.error('Error loading MRL data:', err);
}

// Function to predict MRL for tissues
function predictTissueMrl(species, category, medicine, doseAmount, doseUnit, durationDays, matrix, endDate, currentDate, frequencyPerDay) {
  if (!mrlData[species] || !mrlData[species][category] || !mrlData[species][category][medicine] || matrix !== 'meat') {
    return null;
  }

  const med = mrlData[species][category][medicine];
  const tissues = med.mrl_by_matrix.meat.tissues;
  const pk = med.pk_parameters;
  const riskThresholds = med.risk_thresholds;

  // Check if half_life_days is available
  if (!pk.half_life_days || pk.half_life_days === null) {
    // Use default half-life if not available (e.g., 7 days for demonstration)
    pk.half_life_days = 7;
  }

  const k = Math.log(2) / pk.half_life_days; // Elimination rate constant
  const doseMgPerKg = doseAmount; // Assuming doseAmount is already in mg/kg
  const daysSinceEnd = Math.ceil((new Date(currentDate) - new Date(endDate)) / (1000 * 60 * 60 * 24));

  // Find worst tissue by base MRL
  let worstTissue = 'muscle';
  let maxBaseMrl = 0;
  Object.keys(tissues).forEach(tissue => {
    const baseMrl = parseFloat(tissues[tissue].base_mrl);
    if (baseMrl > maxBaseMrl) {
      maxBaseMrl = baseMrl;
      worstTissue = tissue;
    }
  });

  const results = {};
  let maxRiskPercent = 0;
  let worstPredictedMrl = 0;
  let withdrawalDays = 0;
  let overall_risk_category = 'SAFE';
  let message = '';
  let overdosage = false;

  // Overdosage check
  const overdoseMin = med.recommended_doses?.overdose?.min || Infinity;
  overdosage = doseAmount > overdoseMin;

  if (overdosage) {
    const baseDays = parseInt(tissues[worstTissue].base_withdrawal_days);
    const baseMrl = parseFloat(tissues[worstTissue].base_mrl);
    const predicted_mrl = (baseMrl * 1.5).toFixed(2);
    const overdoseMultiplier = Math.ceil(doseAmount / overdoseMin);
    const predicted_withdrawal_days = Math.max(baseDays * overdoseMultiplier, baseDays * 2);
    const safe_date = calculateSafeDate(endDate, predicted_withdrawal_days);

    // Set results for tissues
    Object.keys(tissues).forEach(tissue => {
      const tissueData = tissues[tissue];
      const baseMrlT = parseFloat(tissueData.base_mrl);
      results[tissue] = {
        predicted_mrl: (baseMrlT * 1.5).toFixed(2),
        base_mrl: baseMrlT,
        risk_percent: 150,
        risk_category: 'UNSAFE'
      };
    });

    return {
      tissues: results,
      worst_tissue: worstTissue,
      overall_risk_category: 'UNSAFE',
      predicted_mrl: predicted_mrl,
      predicted_withdrawal_days: predicted_withdrawal_days,
      safe_date: safe_date,
      overdosage: true,
      message: `Overdosage detected (${overdoseMultiplier}x overdose). Mandatory extended withdrawal applied.`
    };
  } else {
    // Normal PK calculation
    const totalDose = doseAmount * frequencyPerDay * durationDays;
    Object.keys(tissues).forEach(tissue => {
      const tissueData = tissues[tissue];
      const partitionFactor = tissueData.partition_factor;
      const baseMrl = parseFloat(tissueData.base_mrl);

      // Initial concentration for tissue
      const C0 = doseMgPerKg * pk.dose_conversion_factor * partitionFactor * pk.species_factor;

      // Predicted residue
      const predictedMrl = C0 * Math.exp(-k * daysSinceEnd);

      // Risk percent
      const riskPercent = (predictedMrl / baseMrl) * 100;

      // Classify
      let riskCategory = 'SAFE';
      if (riskPercent > 100) {
        riskCategory = 'UNSAFE';
      } else if (riskPercent > riskThresholds.safe) {
        riskCategory = 'BORDERLINE';
      }

      results[tissue] = {
        predicted_mrl: predictedMrl,
        base_mrl: baseMrl,
        risk_percent: riskPercent,
        risk_category: riskCategory
      };

      if (riskPercent > maxRiskPercent) {
        maxRiskPercent = riskPercent;
        worstTissue = tissue;
        worstPredictedMrl = predictedMrl;
      }
    });

    // Calculate withdrawal period for worst tissue
    const worstTissueData = tissues[worstTissue];
    const C0Worst = doseMgPerKg * pk.dose_conversion_factor * worstTissueData.partition_factor * pk.species_factor;
    const baseMrlWorst = parseFloat(worstTissueData.base_mrl);

    if (C0Worst > 0 && baseMrlWorst > 0) {
      // Only calculate withdrawal if initial concentration exceeds MRL
      if (C0Worst > baseMrlWorst) {
        withdrawalDays = Math.ceil((Math.log(C0Worst) - Math.log(baseMrlWorst)) / k);
        // Ensure withdrawal days is not negative
        withdrawalDays = Math.max(0, withdrawalDays);
      }
    }

    // Check for tissue-level unsafe
    let tissueUnsafe = false;
    let unsafeTissueList = [];
    Object.keys(results).forEach(tissue => {
      if (results[tissue].predicted_mrl > results[tissue].base_mrl) {
        results[tissue].risk_category = 'UNSAFE';
        tissueUnsafe = true;
        unsafeTissueList.push(tissue);
      }
    });

    if (tissueUnsafe) {
      overall_risk_category = 'UNSAFE';
      message = `Unsafe: Residues exceed legal limits in ${unsafeTissueList.join(', ')}`;
      withdrawalDays = parseInt(tissues[worstTissue].base_withdrawal_days) * 2;
    } else {
      overall_risk_category = results[worstTissue].risk_category;
      const baseWithdrawalDays = parseInt(tissues[worstTissue].base_withdrawal_days);
      const persistenceFactor = med.mrl_by_matrix.meat.persistence_factor || 0;
      withdrawalDays = Math.max(
        baseWithdrawalDays,
        Math.ceil(baseWithdrawalDays + (totalDose * persistenceFactor))
      );
    }
    // Build and return the prediction object for normal (non-overdose) cases
    const safe_date = calculateSafeDate(endDate, withdrawalDays);
    return {
      tissues: results,
      worst_tissue: worstTissue,
      overall_risk_category: overall_risk_category || (results[worstTissue] && results[worstTissue].risk_category) || 'SAFE',
      predicted_mrl: worstPredictedMrl,
      predicted_withdrawal_days: withdrawalDays,
      safe_date: safe_date,
      overdosage: false,
      message: message
    };
  }
}

// Function to check overdosage
function checkOverdosage(species, category, medicine, doseAmount, doseUnit, frequencyPerDay) {
  if (!mrlData[species] || !mrlData[species][category] || !mrlData[species][category][medicine]) {
    return false;
  }
  const med = mrlData[species][category][medicine];
  let recommendedDose = med.recommended_dose_mg_per_kg;
  if (!recommendedDose) {
    // Use max from safe range if available
    if (med.recommended_doses && med.recommended_doses.safe && med.recommended_doses.safe.max) {
      recommendedDose = med.recommended_doses.safe.max;
    } else {
      return false; // Cannot determine
    }
  }
  return (doseAmount * frequencyPerDay) > recommendedDose;
}

// Function to calculate safe date
function calculateSafeDate(startDate, withdrawalDays) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + withdrawalDays);
  return date.toISOString().split('T')[0];
}

module.exports = {
  predictTissueMrl,
  checkOverdosage,
  calculateSafeDate
};