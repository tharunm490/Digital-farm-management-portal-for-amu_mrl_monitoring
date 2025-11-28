const db = require('../config/database');

const drugMasterData = [
  // CRITICALLY IMPORTANT ANTIMICROBIALS
  {
    drug_name: 'Amoxicillin',
    active_ingredient: 'Amoxicillin',
    drug_class: 'Beta-lactam',
    who_criticality: 'critically_important',
    banned_for_food_animals: false,
    common_indications: 'Bacterial infections, pneumonia, mastitis',
    side_effects: 'Allergic reactions in sensitive animals'
  },
  {
    drug_name: 'Oxytetracycline',
    active_ingredient: 'Oxytetracycline',
    drug_class: 'Tetracycline',
    who_criticality: 'critically_important',
    banned_for_food_animals: false,
    common_indications: 'Respiratory infections, arthritis',
    side_effects: 'Tooth discoloration in young animals'
  },
  {
    drug_name: 'Ciprofloxacin',
    active_ingredient: 'Ciprofloxacin',
    drug_class: 'Fluoroquinolone',
    who_criticality: 'critically_important',
    banned_for_food_animals: false,
    common_indications: 'Severe bacterial infections',
    side_effects: 'GI upset, photosensitivity'
  },
  {
    drug_name: 'Ceftriaxone',
    active_ingredient: 'Ceftriaxone',
    drug_class: 'Cephalosporin',
    who_criticality: 'critically_important',
    banned_for_food_animals: false,
    common_indications: 'Serious infections, meningitis',
    side_effects: 'Allergic reactions'
  },

  // HIGHLY IMPORTANT ANTIMICROBIALS
  {
    drug_name: 'Sulfamethoxazole',
    active_ingredient: 'Sulfamethoxazole',
    drug_class: 'Sulfonamide',
    who_criticality: 'highly_important',
    banned_for_food_animals: false,
    common_indications: 'Urinary infections, coccidiosis',
    side_effects: 'Allergic reactions, crystalluria'
  },
  {
    drug_name: 'Gentamicin',
    active_ingredient: 'Gentamicin',
    drug_class: 'Aminoglycoside',
    who_criticality: 'highly_important',
    banned_for_food_animals: false,
    common_indications: 'Gram-negative infections',
    side_effects: 'Ototoxicity, nephrotoxicity'
  },
  {
    drug_name: 'Erythromycin',
    active_ingredient: 'Erythromycin',
    drug_class: 'Macrolide',
    who_criticality: 'highly_important',
    banned_for_food_animals: false,
    common_indications: 'Respiratory infections',
    side_effects: 'GI disturbance'
  },
  {
    drug_name: 'Doxycycline',
    active_ingredient: 'Doxycycline',
    drug_class: 'Tetracycline',
    who_criticality: 'highly_important',
    banned_for_food_animals: false,
    common_indications: 'Respiratory infections',
    side_effects: 'Photosensitivity'
  },

  // IMPORTANT ANTIMICROBIALS
  {
    drug_name: 'Penicillin G',
    active_ingredient: 'Benzylpenicillin',
    drug_class: 'Beta-lactam',
    who_criticality: 'important',
    banned_for_food_animals: false,
    common_indications: 'Bacterial infections, mastitis',
    side_effects: 'Allergic reactions'
  },
  {
    drug_name: 'Streptomycin',
    active_ingredient: 'Streptomycin',
    drug_class: 'Aminoglycoside',
    who_criticality: 'important',
    banned_for_food_animals: false,
    common_indications: 'TB-like infections',
    side_effects: 'Ototoxicity'
  },
  {
    drug_name: 'Chloramphenicol',
    active_ingredient: 'Chloramphenicol',
    drug_class: 'Phenicol',
    who_criticality: 'important',
    banned_for_food_animals: true,
    common_indications: 'Serious infections',
    side_effects: 'Bone marrow suppression'
  },
  {
    drug_name: 'Metronidazole',
    active_ingredient: 'Metronidazole',
    drug_class: 'Antiprotozoal',
    who_criticality: 'important',
    banned_for_food_animals: true,
    common_indications: 'Parasitic infections',
    side_effects: 'GI upset, neurological effects'
  },
  {
    drug_name: 'Neomycin',
    active_ingredient: 'Neomycin',
    drug_class: 'Aminoglycoside',
    who_criticality: 'important',
    banned_for_food_animals: false,
    common_indications: 'Enteritis, infections',
    side_effects: 'Poor absorption'
  },
  {
    drug_name: 'Tilmicosin',
    active_ingredient: 'Tilmicosin',
    drug_class: 'Macrolide',
    who_criticality: 'important',
    banned_for_food_animals: false,
    common_indications: 'Respiratory infections',
    side_effects: 'Neurotoxicity at high doses'
  },

  // NON-ANTIBIOTIC MEDICATIONS
  {
    drug_name: 'Ibuprofen',
    active_ingredient: 'Ibuprofen',
    drug_class: 'NSAID',
    who_criticality: 'important',
    banned_for_food_animals: false,
    common_indications: 'Inflammation, pain relief',
    side_effects: 'GI upset, renal issues'
  },
  {
    drug_name: 'Paracetamol',
    active_ingredient: 'Paracetamol',
    drug_class: 'Analgesic',
    who_criticality: 'important',
    banned_for_food_animals: false,
    common_indications: 'Pain, fever',
    side_effects: 'Liver toxicity at high doses'
  },
  {
    drug_name: 'Levamisole',
    active_ingredient: 'Levamisole',
    drug_class: 'Anthelmintic',
    who_criticality: 'important',
    banned_for_food_animals: false,
    common_indications: 'Parasitic infections',
    side_effects: 'Agranulocytosis'
  }
];

const mrlReferenceData = [
  // AMOXICILLIN MRL DATA
  {
    drug_index: 0,
    species: 'cattle',
    matrix: 'milk',
    mrl_value_ppb: 4,
    mrl_value_ppm: 0.004,
    withdrawal_days: 5,
    source: 'codex'
  },
  {
    drug_index: 0,
    species: 'cattle',
    matrix: 'meat',
    mrl_value_ppb: 50,
    mrl_value_ppm: 0.05,
    withdrawal_days: 7,
    source: 'codex'
  },
  {
    drug_index: 0,
    species: 'poultry',
    matrix: 'meat',
    mrl_value_ppb: 30,
    mrl_value_ppm: 0.03,
    withdrawal_days: 5,
    source: 'codex'
  },
  {
    drug_index: 0,
    species: 'poultry',
    matrix: 'egg',
    mrl_value_ppb: 10,
    mrl_value_ppm: 0.01,
    withdrawal_days: 3,
    source: 'codex'
  },

  // OXYTETRACYCLINE MRL DATA
  {
    drug_index: 1,
    species: 'cattle',
    matrix: 'milk',
    mrl_value_ppb: 100,
    mrl_value_ppm: 0.1,
    withdrawal_days: 5,
    source: 'codex'
  },
  {
    drug_index: 1,
    species: 'cattle',
    matrix: 'meat',
    mrl_value_ppb: 100,
    mrl_value_ppm: 0.1,
    withdrawal_days: 10,
    source: 'codex'
  },
  {
    drug_index: 1,
    species: 'poultry',
    matrix: 'meat',
    mrl_value_ppb: 200,
    mrl_value_ppm: 0.2,
    withdrawal_days: 5,
    source: 'codex'
  },

  // CIPROFLOXACIN MRL DATA (FSSAI)
  {
    drug_index: 2,
    species: 'cattle',
    matrix: 'milk',
    mrl_value_ppb: 100,
    mrl_value_ppm: 0.1,
    withdrawal_days: 7,
    source: 'fssai'
  },
  {
    drug_index: 2,
    species: 'cattle',
    matrix: 'meat',
    mrl_value_ppb: 100,
    mrl_value_ppm: 0.1,
    withdrawal_days: 10,
    source: 'fssai'
  },

  // PENICILLIN G MRL DATA
  {
    drug_index: 8,
    species: 'cattle',
    matrix: 'milk',
    mrl_value_ppb: 4,
    mrl_value_ppm: 0.004,
    withdrawal_days: 3,
    source: 'codex'
  },
  {
    drug_index: 8,
    species: 'cattle',
    matrix: 'meat',
    mrl_value_ppb: 50,
    mrl_value_ppm: 0.05,
    withdrawal_days: 5,
    source: 'codex'
  },

  // SULFAMETHOXAZOLE MRL DATA
  {
    drug_index: 4,
    species: 'cattle',
    matrix: 'milk',
    mrl_value_ppb: 100,
    mrl_value_ppm: 0.1,
    withdrawal_days: 7,
    source: 'codex'
  },
  {
    drug_index: 4,
    species: 'cattle',
    matrix: 'meat',
    mrl_value_ppb: 100,
    mrl_value_ppm: 0.1,
    withdrawal_days: 10,
    source: 'codex'
  },
  {
    drug_index: 4,
    species: 'poultry',
    matrix: 'meat',
    mrl_value_ppb: 100,
    mrl_value_ppm: 0.1,
    withdrawal_days: 7,
    source: 'codex'
  }
];

async function populateDrugMaster() {
  try {
    console.log('🔄 Starting drug master population...');

    // Insert drug master records
    for (const drug of drugMasterData) {
      try {
        const [result] = await db.execute(
          `INSERT INTO drug_master 
           (drug_name, active_ingredient, drug_class, who_criticality, banned_for_food_animals, common_indications, side_effects)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            drug.drug_name,
            drug.active_ingredient,
            drug.drug_class,
            drug.who_criticality,
            drug.banned_for_food_animals,
            drug.common_indications,
            drug.side_effects
          ]
        );

        console.log(`✅ Added drug: ${drug.drug_name} (ID: ${result.insertId})`);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`⏭️  Drug already exists: ${drug.drug_name}`);
        } else {
          throw error;
        }
      }
    }

    // Get all drugs to map indices
    const [drugs] = await db.execute('SELECT drug_id, drug_name FROM drug_master');
    const drugMap = {};
    drugs.forEach(drug => {
      drugMap[drug.drug_name] = drug.drug_id;
    });

    // Insert MRL reference data
    for (const mrl of mrlReferenceData) {
      const drugName = drugMasterData[mrl.drug_index].drug_name;
      const drugId = drugMap[drugName];

      try {
        await db.execute(
          `INSERT INTO mrl_reference 
           (drug_id, species, matrix, mrl_value_ppb, mrl_value_ppm, withdrawal_days, source)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            drugId,
            mrl.species,
            mrl.matrix,
            mrl.mrl_value_ppb,
            mrl.mrl_value_ppm,
            mrl.withdrawal_days,
            mrl.source
          ]
        );

        console.log(`✅ Added MRL: ${drugName} - ${mrl.species}/${mrl.matrix}`);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`⏭️  MRL already exists: ${drugName} - ${mrl.species}/${mrl.matrix}`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Drug master population completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating drug master:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  populateDrugMaster();
}

module.exports = { populateDrugMaster };
