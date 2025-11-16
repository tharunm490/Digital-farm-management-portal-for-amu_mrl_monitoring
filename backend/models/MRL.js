const db = require('../config/database');

class MRL {
  // Get MRL value for specific combination
  static async getMRL(species, matrix, activeIngredient) {
    const query = `
      SELECT * FROM mrl_table 
      WHERE LOWER(species) = LOWER(?) 
        AND LOWER(matrix) = LOWER(?) 
        AND LOWER(active_ingredient) = LOWER(?)
    `;
    const [rows] = await db.execute(query, [species, matrix, activeIngredient]);
    return rows[0];
  }

  // Get all MRLs for a species and matrix combination
  static async getBySpeciesAndMatrix(species, matrix) {
    const query = `
      SELECT * FROM mrl_table 
      WHERE LOWER(species) = LOWER(?) 
        AND LOWER(matrix) = LOWER(?)
      ORDER BY active_ingredient
    `;
    const [rows] = await db.execute(query, [species, matrix]);
    return rows;
  }

  // Get all MRLs for a species
  static async getBySpecies(species) {
    const query = `
      SELECT * FROM mrl_table 
      WHERE LOWER(species) = LOWER(?)
      ORDER BY matrix, active_ingredient
    `;
    const [rows] = await db.execute(query, [species]);
    return rows;
  }

  // Get all MRLs for an active ingredient
  static async getByActiveIngredient(activeIngredient) {
    const query = `
      SELECT * FROM mrl_table 
      WHERE LOWER(active_ingredient) = LOWER(?)
      ORDER BY species, matrix
    `;
    const [rows] = await db.execute(query, [activeIngredient]);
    return rows;
  }

  // Get all MRLs
  static async getAll() {
    const query = 'SELECT * FROM mrl_table ORDER BY species, matrix, active_ingredient';
    const [rows] = await db.execute(query);
    return rows;
  }

  // Search MRLs
  static async search(searchParams) {
    let query = 'SELECT * FROM mrl_table WHERE 1=1';
    const values = [];

    if (searchParams.species) {
      query += ' AND LOWER(species) = LOWER(?)';
      values.push(searchParams.species);
    }

    if (searchParams.matrix) {
      query += ' AND LOWER(matrix) = LOWER(?)';
      values.push(searchParams.matrix);
    }

    if (searchParams.active_ingredient) {
      query += ' AND LOWER(active_ingredient) LIKE LOWER(?)';
      values.push(`%${searchParams.active_ingredient}%`);
    }

    query += ' ORDER BY species, matrix, active_ingredient';

    const [rows] = await db.execute(query, values);
    return rows;
  }

  // Check if medicine usage complies with MRL
  static async checkCompliance(species, matrix, activeIngredient, measuredLevel) {
    const mrl = await this.getMRL(species, matrix, activeIngredient);
    
    if (!mrl) {
      return {
        compliant: null,
        message: 'No MRL data available for this combination',
        mrl_value: null
      };
    }

    const compliant = parseFloat(measuredLevel) <= parseFloat(mrl.mrl_value);
    
    return {
      compliant,
      message: compliant 
        ? 'Within safe MRL limits' 
        : 'EXCEEDS MRL - Product may not be safe for consumption',
      mrl_value: mrl.mrl_value,
      unit: mrl.unit,
      measured: measuredLevel
    };
  }

  // Get unique species list
  static async getSpeciesList() {
    const query = 'SELECT DISTINCT species FROM mrl_table ORDER BY species';
    const [rows] = await db.execute(query);
    return rows.map(row => row.species);
  }

  // Get unique active ingredients list
  static async getActiveIngredientsList() {
    const query = 'SELECT DISTINCT active_ingredient FROM mrl_table ORDER BY active_ingredient';
    const [rows] = await db.execute(query);
    return rows.map(row => row.active_ingredient);
  }
}

module.exports = MRL;
