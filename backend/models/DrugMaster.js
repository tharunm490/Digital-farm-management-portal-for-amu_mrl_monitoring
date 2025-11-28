const db = require('../config/database');

class DrugMaster {
  // Search drugs by name or active ingredient
  static async searchDrugs(query) {
    try {
      const [results] = await db.execute(
        `SELECT * FROM drug_master 
         WHERE drug_name LIKE ? OR active_ingredient LIKE ? 
         ORDER BY drug_name ASC LIMIT 50`,
        [`%${query}%`, `%${query}%`]
      );
      return results;
    } catch (error) {
      console.error('Error searching drugs:', error);
      throw error;
    }
  }

  // Get drug with MRL data for specific species/matrix
  static async getDrugWithMRL(drugId, species, matrix) {
    try {
      const [drugRows] = await db.execute(
        'SELECT * FROM drug_master WHERE drug_id = ?',
        [drugId]
      );

      if (!drugRows.length) {
        throw new Error('Drug not found');
      }

      const drug = drugRows[0];

      const [mrlRows] = await db.execute(
        `SELECT * FROM mrl_reference 
         WHERE drug_id = ? AND species = ? AND matrix = ?
         ORDER BY created_at DESC`,
        [drugId, species, matrix]
      );

      return {
        ...drug,
        mrl_data: mrlRows
      };
    } catch (error) {
      console.error('Error fetching drug with MRL:', error);
      throw error;
    }
  }

  // Get all critically important antimicrobials
  static async getCriticallyImportantDrugs() {
    try {
      const [results] = await db.execute(
        `SELECT * FROM drug_master 
         WHERE who_criticality = 'critically_important'
         ORDER BY drug_name ASC`
      );
      return results;
    } catch (error) {
      console.error('Error fetching critical drugs:', error);
      throw error;
    }
  }

  // Get banned drugs for food animals
  static async getBannedDrugs() {
    try {
      const [results] = await db.execute(
        `SELECT * FROM drug_master 
         WHERE banned_for_food_animals = TRUE
         ORDER BY drug_name ASC`
      );
      return results;
    } catch (error) {
      console.error('Error fetching banned drugs:', error);
      throw error;
    }
  }

  // Get alternative drugs (safer options)
  static async getAlternatives(drugId, species, matrix) {
    try {
      // Get the drug class of the original drug
      const [originalDrug] = await db.execute(
        'SELECT drug_class FROM drug_master WHERE drug_id = ?',
        [drugId]
      );

      if (!originalDrug.length) {
        throw new Error('Drug not found');
      }

      const drugClass = originalDrug[0].drug_class;

      // Get all drugs in the same class with lower criticality
      const [alternatives] = await db.execute(
        `SELECT d.*, mr.mrl_value_ppb, mr.withdrawal_days 
         FROM drug_master d
         LEFT JOIN mrl_reference mr ON d.drug_id = mr.drug_id 
           AND mr.species = ? AND mr.matrix = ?
         WHERE d.drug_class = ? 
         AND d.drug_id != ?
         AND (d.who_criticality IN ('highly_important', 'important') 
           OR d.who_criticality IS NULL)
         AND d.banned_for_food_animals = FALSE
         ORDER BY d.who_criticality ASC, d.drug_name ASC`,
        [species, matrix, drugClass, drugId]
      );

      return alternatives;
    } catch (error) {
      console.error('Error fetching alternatives:', error);
      throw error;
    }
  }

  // Create new drug record
  static async create(drugData) {
    const {
      drug_name,
      active_ingredient,
      drug_class,
      who_criticality,
      banned_for_food_animals,
      common_indications,
      side_effects
    } = drugData;

    try {
      const [result] = await db.execute(
        `INSERT INTO drug_master 
         (drug_name, active_ingredient, drug_class, who_criticality, banned_for_food_animals, common_indications, side_effects)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          drug_name,
          active_ingredient,
          drug_class,
          who_criticality || 'important',
          banned_for_food_animals || false,
          common_indications,
          side_effects
        ]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error creating drug:', error);
      throw error;
    }
  }

  // Get drug by ID
  static async getById(drugId) {
    try {
      const [results] = await db.execute(
        'SELECT * FROM drug_master WHERE drug_id = ?',
        [drugId]
      );
      return results[0] || null;
    } catch (error) {
      console.error('Error fetching drug by ID:', error);
      throw error;
    }
  }

  // Get all drugs with pagination
  static async getAll(page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const [results] = await db.execute(
        `SELECT * FROM drug_master 
         ORDER BY drug_name ASC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      const [countResult] = await db.execute(
        'SELECT COUNT(*) as total FROM drug_master'
      );

      return {
        data: results,
        total: countResult[0].total,
        page,
        limit,
        pages: Math.ceil(countResult[0].total / limit)
      };
    } catch (error) {
      console.error('Error fetching drugs:', error);
      throw error;
    }
  }

  // Add MRL reference for a drug
  static async addMRLReference(mrlData) {
    const {
      drug_id,
      species,
      matrix,
      mrl_value_ppb,
      mrl_value_ppm,
      withdrawal_days,
      source,
      notes
    } = mrlData;

    try {
      const [result] = await db.execute(
        `INSERT INTO mrl_reference 
         (drug_id, species, matrix, mrl_value_ppb, mrl_value_ppm, withdrawal_days, source, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          drug_id,
          species,
          matrix,
          mrl_value_ppb,
          mrl_value_ppm,
          withdrawal_days,
          source,
          notes
        ]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error adding MRL reference:', error);
      throw error;
    }
  }

  // Get MRL references for a drug
  static async getMRLReferences(drugId) {
    try {
      const [results] = await db.execute(
        `SELECT * FROM mrl_reference 
         WHERE drug_id = ?
         ORDER BY species ASC, matrix ASC`,
        [drugId]
      );
      return results;
    } catch (error) {
      console.error('Error fetching MRL references:', error);
      throw error;
    }
  }

  // Get WHO criticality statistics
  static async getCriticalityStats() {
    try {
      const [results] = await db.execute(
        `SELECT 
          who_criticality,
          COUNT(*) as count,
          SUM(CASE WHEN banned_for_food_animals = TRUE THEN 1 ELSE 0 END) as banned_count
         FROM drug_master
         GROUP BY who_criticality`
      );
      return results;
    } catch (error) {
      console.error('Error fetching criticality stats:', error);
      throw error;
    }
  }

  // Get drugs by class
  static async getDrugsByClass(drugClass) {
    try {
      const [results] = await db.execute(
        `SELECT * FROM drug_master 
         WHERE drug_class = ?
         ORDER BY who_criticality ASC, drug_name ASC`,
        [drugClass]
      );
      return results;
    } catch (error) {
      console.error('Error fetching drugs by class:', error);
      throw error;
    }
  }
}

module.exports = DrugMaster;
