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
function predictTissueMrl(species, category, medicine, doseAmount, doseUnit, durationDays, matrix, endDate, currentDate) {
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

  const results = {};
  let worstTissue = 'muscle';
  let maxRiskPercent = 0;
  let worstPredictedMrl = 0;
  let withdrawalDays = 0;

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
      // Ensure withdrawal days is not negative (shouldn't happen with the check above, but safety net)
      withdrawalDays = Math.max(0, withdrawalDays);
    }
    // If C0Worst <= baseMrlWorst, withdrawalDays remains 0 (no withdrawal needed)
  }

  const safeDate = new Date(endDate);
  safeDate.setDate(safeDate.getDate() + withdrawalDays);

  return {
    tissues: results,
    worst_tissue: worstTissue,
    overall_risk_category: results[worstTissue].risk_category,
    predicted_mrl: worstPredictedMrl,
    predicted_withdrawal_days: withdrawalDays,
    safe_date: safeDate.toISOString().split('T')[0]
  };
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