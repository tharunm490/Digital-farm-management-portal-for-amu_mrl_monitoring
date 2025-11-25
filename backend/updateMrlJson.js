// updateMrlJson.js - Script to update MRL JSON with tissue-level predictions for MEAT
const fs = require('fs');
const path = require('path');

// Load the base JSON file (replace with actual path)
const baseJsonPath = path.join(__dirname, 'dosage_reference_full_extended.json'); // Adjust path as needed
const updatedJsonPath = path.join(__dirname, 'updated_mrl_per_species_matrix_refined6_UPDATED.json');

// Function to update the JSON
function updateMrlJson(data) {
  // Iterate through species
  Object.keys(data).forEach(species => {
    if (data[species].medicines) {
      Object.keys(data[species].medicines).forEach(medicine => {
        const med = data[species].medicines[medicine];
        if (med.matrix && med.matrix.meat) {
          // Add tissue-level structure
          med.matrix.meat.tissues = {
            muscle: {
              base_mrl: med.matrix.meat.base_mrl || 0,
              base_withdrawal_days: med.matrix.meat.base_withdrawal_days || 0,
              mrl_unit: med.matrix.meat.mrl_unit || 'ug/kg',
              safe_threshold: (med.matrix.meat.base_mrl || 0) * 0.8,
              borderline_threshold: (med.matrix.meat.base_mrl || 0) * 1.0,
              unsafe_threshold: (med.matrix.meat.base_mrl || 0) * 1.2
            },
            fat: {
              base_mrl: med.matrix.meat.base_mrl || 0,
              base_withdrawal_days: med.matrix.meat.base_withdrawal_days || 0,
              mrl_unit: med.matrix.meat.mrl_unit || 'ug/kg',
              safe_threshold: (med.matrix.meat.base_mrl || 0) * 0.8,
              borderline_threshold: (med.matrix.meat.base_mrl || 0) * 1.0,
              unsafe_threshold: (med.matrix.meat.base_mrl || 0) * 1.2
            },
            liver: {
              base_mrl: med.matrix.meat.base_mrl || 0,
              base_withdrawal_days: med.matrix.meat.base_withdrawal_days || 0,
              mrl_unit: med.matrix.meat.mrl_unit || 'ug/kg',
              safe_threshold: (med.matrix.meat.base_mrl || 0) * 0.8,
              borderline_threshold: (med.matrix.meat.base_mrl || 0) * 1.0,
              unsafe_threshold: (med.matrix.meat.base_mrl || 0) * 1.2
            },
            kidney: {
              base_mrl: med.matrix.meat.base_mrl || 0,
              base_withdrawal_days: med.matrix.meat.base_withdrawal_days || 0,
              mrl_unit: med.matrix.meat.mrl_unit || 'ug/kg',
              safe_threshold: (med.matrix.meat.base_mrl || 0) * 0.8,
              borderline_threshold: (med.matrix.meat.base_mrl || 0) * 1.0,
              unsafe_threshold: (med.matrix.meat.base_mrl || 0) * 1.2
            }
          };
        }
      });
    }
  });
  return data;
}

// Read, update, and write the JSON
fs.readFile(baseJsonPath, 'utf8', (err, jsonString) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }
  try {
    const data = JSON.parse(jsonString);
    const updatedData = updateMrlJson(data);
    fs.writeFile(updatedJsonPath, JSON.stringify(updatedData, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Error writing file:', err);
        return;
      }
      console.log('Updated JSON saved to', updatedJsonPath);
    });
  } catch (parseErr) {
    console.error('Error parsing JSON:', parseErr);
  }
});

module.exports = { updateMrlJson };