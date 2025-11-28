const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const jsonPath = path.join(__dirname, '../data/dosage_reference_full_extended_with_mrl.json');
// Check if the refined file exists, otherwise use the standard one
const refinedJsonPath = path.join(__dirname, '../../updated_mrl_per_species_matrix_refined2.json');

async function populateMRL() {
    try {
        console.log('🔄 Starting MRL data population...');

        let mrlData;
        if (fs.existsSync(refinedJsonPath)) {
            console.log(`📂 Reading data from: ${refinedJsonPath}`);
            const rawData = fs.readFileSync(refinedJsonPath, 'utf8');
            mrlData = JSON.parse(rawData);
        } else if (fs.existsSync(jsonPath)) {
            console.log(`📂 Reading data from: ${jsonPath}`);
            const rawData = fs.readFileSync(jsonPath, 'utf8');
            mrlData = JSON.parse(rawData);
        } else {
            throw new Error('MRL data file not found!');
        }

        // Iterate through the nested structure
        for (const species in mrlData) {
            const drugClasses = mrlData[species];
            for (const drugClass in drugClasses) {
                const drugs = drugClasses[drugClass];
                for (const drugName in drugs) {
                    const drugInfo = drugs[drugName];

                    // 1. Insert/Update Drug Master
                    let drugId;
                    try {
                        // Check if drug exists
                        const [existingDrugs] = await db.execute(
                            'SELECT drug_id FROM drug_master WHERE drug_name = ? AND active_ingredient = ?',
                            [drugInfo.medicine, drugInfo.medicine] // Assuming medicine name is active ingredient for now if not specified
                        );

                        if (existingDrugs.length > 0) {
                            drugId = existingDrugs[0].drug_id;
                            // console.log(`ℹ️  Drug exists: ${drugInfo.medicine} (ID: ${drugId})`);
                        } else {
                            const [result] = await db.execute(
                                `INSERT INTO drug_master 
                 (drug_name, active_ingredient, drug_class, common_indications)
                 VALUES (?, ?, ?, ?)`,
                                [
                                    drugInfo.medicine,
                                    drugInfo.medicine, // Using medicine name as active ingredient
                                    drugClass,
                                    drugInfo.common_reasons ? drugInfo.common_reasons.join(', ') : null
                                ]
                            );
                            drugId = result.insertId;
                            console.log(`✅ Added drug: ${drugInfo.medicine} (ID: ${drugId})`);
                        }
                    } catch (err) {
                        console.error(`❌ Error processing drug ${drugInfo.medicine}:`, err.message);
                        continue;
                    }

                    // 2. Insert MRL Reference Data
                    if (drugInfo.mrl_by_matrix) {
                        for (const matrix in drugInfo.mrl_by_matrix) {
                            const mrlInfo = drugInfo.mrl_by_matrix[matrix];

                            // Extract safe limit (ppb)
                            let mrlValuePPB = 0;
                            if (mrlInfo.mrl_ug_per_kg && mrlInfo.mrl_ug_per_kg.safe) {
                                mrlValuePPB = mrlInfo.mrl_ug_per_kg.safe;
                            } else if (mrlInfo.base_mrl) {
                                mrlValuePPB = parseFloat(mrlInfo.base_mrl);
                            }

                            const mrlValuePPM = mrlValuePPB / 1000;
                            const withdrawalDays = mrlInfo.base_withdrawal_days ? parseInt(mrlInfo.base_withdrawal_days) : 0;

                            try {
                                // Check if MRL exists
                                const [existingMRL] = await db.execute(
                                    `SELECT mrl_id FROM mrl_reference 
                   WHERE drug_id = ? AND species = ? AND matrix = ? AND source = 'codex'`,
                                    [drugId, species, matrix]
                                );

                                if (existingMRL.length === 0) {
                                    await db.execute(
                                        `INSERT INTO mrl_reference 
                     (drug_id, species, matrix, mrl_value_ppb, mrl_value_ppm, withdrawal_days, source)
                     VALUES (?, ?, ?, ?, ?, ?, 'codex')`,
                                        [
                                            drugId,
                                            species,
                                            matrix,
                                            mrlValuePPB,
                                            mrlValuePPM,
                                            withdrawalDays
                                        ]
                                    );
                                    console.log(`   ✅ Added MRL for ${drugInfo.medicine} - ${species}/${matrix}`);
                                } else {
                                    // Update existing if needed
                                    await db.execute(
                                        `UPDATE mrl_reference 
                     SET mrl_value_ppb = ?, mrl_value_ppm = ?, withdrawal_days = ?
                     WHERE mrl_id = ?`,
                                        [mrlValuePPB, mrlValuePPM, withdrawalDays, existingMRL[0].mrl_id]
                                    );
                                    // console.log(`   ℹ️  Updated MRL for ${drugInfo.medicine} - ${species}/${matrix}`);
                                }
                            } catch (err) {
                                console.error(`   ❌ Error processing MRL for ${drugInfo.medicine} - ${species}/${matrix}:`, err.message);
                            }
                        }
                    }
                }
            }
        }

        console.log('✅ MRL population completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    populateMRL();
}

module.exports = { populateMRL };
