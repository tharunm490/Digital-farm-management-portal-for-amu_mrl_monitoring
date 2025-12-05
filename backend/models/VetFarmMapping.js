const db = require('../config/database');

const VetFarmMapping = {
  // Create mapping
  create: async (vet_id, farm_id) => {
    const [result] = await db.query(
      'INSERT INTO vet_farm_mapping (vet_id, farm_id) VALUES (?, ?)',
      [vet_id, farm_id]
    );
    return result.insertId;
  },

  // Get farms mapped to a vet
  getFarmsByVet: async (vet_id) => {
    const [rows] = await db.query(`
      SELECT f.*, fr.farmer_id, u.display_name as farmer_name, vfm.assigned_at
      FROM farms f
      JOIN vet_farm_mapping vfm ON f.farm_id = vfm.farm_id
      LEFT JOIN farmers fr ON f.farmer_id = fr.farmer_id
      LEFT JOIN users u ON fr.user_id = u.user_id
      WHERE vfm.vet_id = ?
      ORDER BY f.created_at DESC
    `, [vet_id]);
    return rows;
  },

  // Get vets for a specific farm
  getVetsByFarm: async (farm_id) => {
    const [rows] = await db.query(`
      SELECT v.*, u.display_name, u.email, vfm.assigned_at
      FROM veterinarians v
      JOIN users u ON v.user_id = u.user_id
      JOIN vet_farm_mapping vfm ON v.vet_id = vfm.vet_id
      WHERE vfm.farm_id = ?
      ORDER BY vfm.assigned_at DESC
    `, [farm_id]);
    return rows;
  },

  // Get the assigned vet for a specific farm (returns the most recently assigned vet)
  getVetForFarm: async (farm_id) => {
    const vets = await VetFarmMapping.getVetsByFarm(farm_id);
    return vets.length > 0 ? vets[0] : null;
  },

  // Auto-assign vet based on location
  autoAssignVet: async (farm_id, state, district, taluk = null) => {
    // Try exact taluk match
    let vets = await VetFarmMapping.getVetsByLocation(state, district, taluk);

    // If no taluk match, try district
    if (vets.length === 0 && district) {
      vets = await VetFarmMapping.getVetsByLocation(state, district);
    }

    // If no district match, try state
    if (vets.length === 0) {
      vets = await VetFarmMapping.getVetsByLocation(state);
    }

    // If still no vet, assign default (first vet)
    if (vets.length === 0) {
      const [rows] = await db.query('SELECT * FROM veterinarians LIMIT 1');
      vets = rows;
    }

    if (vets.length > 0) {
      const vet = vets[0];
      // Use vet_id which is the primary key in veterinarians table
      await VetFarmMapping.create(vet.vet_id, farm_id);
      return vet.vet_id;
    }

    return null;
  },

  // Get vets by location (helper method) - location is in users table
  getVetsByLocation: async (state, district = null, taluk = null) => {
    let query = `
      SELECT v.*, u.display_name, u.email, u.state, u.district, u.taluk 
      FROM veterinarians v 
      JOIN users u ON v.user_id = u.user_id 
      WHERE u.state = ?
    `;
    const params = [state];
    
    if (district) {
      query += ' AND u.district = ?';
      params.push(district);
    }
    
    if (taluk) {
      query += ' AND u.taluk = ?';
      params.push(taluk);
    }
    
    const [rows] = await db.query(query, params);
    return rows;
  },

  // Remove mapping
  remove: async (vet_id, farm_id) => {
    const [result] = await db.query(
      'DELETE FROM vet_farm_mapping WHERE vet_id = ? AND farm_id = ?',
      [vet_id, farm_id]
    );
    return result.affectedRows;
  }
};

module.exports = VetFarmMapping;