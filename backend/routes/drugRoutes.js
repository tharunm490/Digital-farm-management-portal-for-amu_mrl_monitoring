const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const DrugMaster = require('../models/DrugMaster');

// Search drugs
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const drugMaster = new DrugMaster();
    const drugs = await drugMaster.searchDrugs(q);

    // Limit results
    const limited = drugs.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: limited,
      count: limited.length
    });
  } catch (error) {
    console.error('Error searching drugs:', error);
    res.status(500).json({ success: false, message: 'Error searching drugs' });
  }
});

// Get all drugs (paginated)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { criticality, species, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM drug_master WHERE 1=1';
    const params = [];

    if (criticality) {
      query += ' AND criticality = ?';
      params.push(criticality);
    }

    if (species) {
      // Check if drug has MRL for this species
      query += ` AND id IN (SELECT DISTINCT drug_id FROM mrl_reference WHERE species = ?)`;
      params.push(species);
    }

    query += ' ORDER BY name LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [drugs] = await db.promise().query(query, params);

    res.json({
      success: true,
      data: drugs,
      count: drugs.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching drugs:', error);
    res.status(500).json({ success: false, message: 'Error fetching drugs' });
  }
});

// Get single drug with MRL info
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const drugMaster = new DrugMaster();
    const drug = await drugMaster.getById(id);

    if (!drug) {
      return res.status(404).json({ success: false, message: 'Drug not found' });
    }

    const mrlReferences = await drugMaster.getMRLReferences(id);

    res.json({
      success: true,
      data: {
        ...drug,
        mrl_references: mrlReferences
      }
    });
  } catch (error) {
    console.error('Error fetching drug:', error);
    res.status(500).json({ success: false, message: 'Error fetching drug' });
  }
});

// Get drug MRL for specific species/matrix
router.get('/:id/mrl', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { species, matrix } = req.query;

    if (!species) {
      return res.status(400).json({ success: false, message: 'Species is required' });
    }

    const query = `
      SELECT m.*, d.name as drug_name, d.criticality
      FROM mrl_reference m
      LEFT JOIN drug_master d ON m.drug_id = d.id
      WHERE m.drug_id = ? AND m.species = ?
    `;
    const params = [id, species];

    let finalQuery = query;
    if (matrix) {
      finalQuery += ' AND m.matrix = ?';
      params.push(matrix);
    }

    const [mrlData] = await db.promise().query(finalQuery, params);

    if (mrlData.length === 0) {
      return res.status(404).json({ success: false, message: 'MRL data not found for this species/matrix combination' });
    }

    res.json({
      success: true,
      data: mrlData
    });
  } catch (error) {
    console.error('Error fetching MRL:', error);
    res.status(500).json({ success: false, message: 'Error fetching MRL data' });
  }
});

// Get safer alternatives
router.get('/:id/alternatives', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { species } = req.query;

    // Get the drug and its class
    const [drugs] = await db.promise().query(
      'SELECT * FROM drug_master WHERE id = ?',
      [id]
    );

    if (drugs.length === 0) {
      return res.status(404).json({ success: false, message: 'Drug not found' });
    }

    const drug = drugs[0];

    // Find alternatives in lower criticality classes
    const criticalities = ['Critically Important', 'Highly Important', 'Important'];
    const currentIndex = criticalities.indexOf(drug.criticality);

    let query = `
      SELECT d.* FROM drug_master d
      WHERE d.drug_class = ? AND d.id != ? AND d.banned_for_food_animals = 0
    `;
    const params = [drug.drug_class, id];

    // Filter by criticality (lower is better)
    if (currentIndex >= 0) {
      const lowerCriticalities = criticalities.slice(currentIndex + 1);
      if (lowerCriticalities.length > 0) {
        query += ` AND d.criticality IN (${lowerCriticalities.map(() => '?').join(',')})`;
        params.push(...lowerCriticalities);
      }
    }

    query += ' ORDER BY d.criticality DESC LIMIT 5';

    const [alternatives] = await db.promise().query(query, params);

    // If no alternatives in same class, get from other classes
    let finalAlternatives = alternatives;
    if (finalAlternatives.length === 0) {
      const [moreAlternatives] = await db.promise().query(`
        SELECT d.* FROM drug_master d
        WHERE d.id != ? AND d.banned_for_food_animals = 0
        ORDER BY d.criticality DESC LIMIT 5
      `, [id]);
      finalAlternatives = moreAlternatives;
    }

    res.json({
      success: true,
      data: finalAlternatives,
      message: `Found ${finalAlternatives.length} safer alternatives`
    });
  } catch (error) {
    console.error('Error fetching alternatives:', error);
    res.status(500).json({ success: false, message: 'Error fetching alternatives' });
  }
});

// Verify QR code (for farmer drug package scanning)
router.post('/verify-qr', authMiddleware, async (req, res) => {
  try {
    const { qr_data, farm_id } = req.body;

    if (!qr_data) {
      return res.status(400).json({ success: false, message: 'QR data is required' });
    }

    // Parse QR code format: DRUG-ID-BATCH-EXPIRY
    // Example: AMOXC-2024-001-BATCH-A-20250315
    const parts = qr_data.split('-');

    if (parts.length < 2) {
      return res.status(400).json({ success: false, message: 'Invalid QR code format' });
    }

    // Try to find drug by code or ID
    let query = 'SELECT * FROM drug_master WHERE drug_code = ? OR id = ?';
    const [drugs] = await db.promise().query(query, [parts[0], parts[0]]);

    if (drugs.length === 0) {
      return res.status(404).json({ success: false, message: 'Drug not found' });
    }

    const drug = drugs[0];

    // Get MRL for this farm's species
    let species = 'Cattle'; // Default
    if (farm_id) {
      const [farms] = await db.promise().query(
        'SELECT species_group FROM farms WHERE id = ?',
        [farm_id]
      );
      if (farms.length > 0) {
        species = farms[0].species_group;
      }
    }

    const [mrlData] = await db.promise().query(`
      SELECT * FROM mrl_reference
      WHERE drug_id = ? AND species = ?
      LIMIT 1
    `, [drug.id, species]);

    // Parse batch and expiry from QR
    let batch = parts[2] || 'Unknown';
    let expiry = parts[parts.length - 1];

    // Validate expiry date if provided
    if (expiry && expiry.length === 8) {
      const expiryDate = new Date(
        parseInt(expiry.substring(0, 4)),
        parseInt(expiry.substring(4, 6)) - 1,
        parseInt(expiry.substring(6, 8))
      );
      
      const today = new Date();
      if (expiryDate < today) {
        return res.status(400).json({
          success: false,
          message: 'Drug package has expired',
          expiry_date: expiryDate
        });
      }
    }

    res.json({
      success: true,
      data: {
        drug: {
          id: drug.id,
          name: drug.name,
          active_ingredient: drug.active_ingredient,
          strength: drug.strength,
          drug_class: drug.drug_class
        },
        criticality: drug.criticality,
        mrl: mrlData.length > 0 ? mrlData[0] : null,
        batch: batch,
        expiry: expiry
      }
    });
  } catch (error) {
    console.error('Error verifying QR:', error);
    res.status(500).json({ success: false, message: 'Error verifying QR code' });
  }
});

// Get WHO critically important drugs
router.get('/critical/list', authMiddleware, async (req, res) => {
  try {
    const drugMaster = new DrugMaster();
    const critical = await drugMaster.getCriticallyImportantDrugs();

    res.json({
      success: true,
      data: critical,
      message: `Found ${critical.length} WHO critically important drugs`
    });
  } catch (error) {
    console.error('Error fetching critical drugs:', error);
    res.status(500).json({ success: false, message: 'Error fetching critical drugs' });
  }
});

// Get banned drugs
router.get('/banned/list', authMiddleware, async (req, res) => {
  try {
    const [banned] = await db.promise().query(
      'SELECT * FROM drug_master WHERE banned_for_food_animals = 1 ORDER BY name'
    );

    res.json({
      success: true,
      data: banned,
      message: `Found ${banned.length} banned drugs`
    });
  } catch (error) {
    console.error('Error fetching banned drugs:', error);
    res.status(500).json({ success: false, message: 'Error fetching banned drugs' });
  }
});

module.exports = router;
