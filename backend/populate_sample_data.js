const db = require('./config/database');
const bcrypt = require('bcrypt');

async function populateSampleData() {
  try {
    console.log('Starting sample data population...');

    // Create sample users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Insert authority user
    const [authorityResult] = await db.execute(`
      INSERT IGNORE INTO users (email, password_hash, display_name, role, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, ['authority@example.com', hashedPassword, 'Authority User', 'authority']);
    const authorityId = authorityResult.insertId || 1;

    // Insert farmer user
    const [farmerResult] = await db.execute(`
      INSERT IGNORE INTO users (email, password_hash, display_name, role, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, ['farmer@example.com', hashedPassword, 'Sample Farmer', 'farmer']);
    const farmerId = farmerResult.insertId || 2;

    // Insert veterinarian user
    const [vetResult] = await db.execute(`
      INSERT IGNORE INTO users (email, password_hash, display_name, role, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, ['vet@example.com', hashedPassword, 'Sample Vet', 'veterinarian']);
    const vetId = vetResult.insertId || 3;

    // Insert farmer profile
    await db.execute(`
      INSERT IGNORE INTO farmers (user_id, phone, address, state, district, taluk)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [farmerId, '9876543210', 'Sample Address', 'Karnataka', 'Udupi', 'Udupi']);

    // Insert vet profile
    await db.execute(`
      INSERT IGNORE INTO veterinarians (vet_id, user_id, vet_name, license_number, phone, state, district, taluk)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['VET12345', vetId, 'Dr. Smith', 'VET12345', '9876543211', 'Karnataka', 'Udupi', 'Udupi']);

    // Insert farm
    const [farmResult] = await db.execute(`
      INSERT IGNORE INTO farms (farmer_id, farm_name, latitude, longitude, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, [farmerId, 'Sample Farm', 13.0827, 74.7482]);
    const farmId = farmResult.insertId || 1;

    // Insert vet-farm mapping
    await db.execute(`
      INSERT IGNORE INTO vet_farm_mapping (vet_id, farm_id)
      VALUES (?, ?)
    `, ['VET12345', farmId]);

    // Insert entities (animals/batches)
    const entities = [
      [farmId, 'animal', 'cattle', 'TAG001', null, 1, 'meat'],
      [farmId, 'animal', 'cattle', 'TAG002', null, 1, 'milk'],
      [farmId, 'batch', 'poultry', null, 'Batch001', 100, 'meat'],
      [farmId, 'animal', 'goat', 'TAG003', null, 1, 'meat']
    ];

    const entityIds = [];
    for (const entity of entities) {
      const [entityResult] = await db.execute(`
        INSERT IGNORE INTO animals_or_batches
        (farm_id, entity_type, species, tag_id, batch_name, batch_count, matrix)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, entity);
      entityIds.push(entityResult.insertId);
    }

    // Insert treatment records
    const treatments = [
      [entityIds[0], farmId, farmerId, 'cattle', 'antibiotic', false, null, null, null, null, 'VET12345', 'Dr. Smith', 'Bacterial infection', 'Fever and lethargy', 'Enrofloxacin', '2025-11-01', '2025-11-05', 'oral', 5.0, 'mg/kg', 1, 5, 'approved'],
      [entityIds[1], farmId, farmerId, 'cattle', 'antibiotic', false, null, null, null, null, 'VET12345', 'Dr. Smith', 'Mastitis', 'Udder inflammation', 'Tetracycline', '2025-11-10', '2025-11-17', 'injection', 10.0, 'mg/kg', 2, 7, 'approved'],
      [entityIds[2], farmId, farmerId, 'poultry', 'antibiotic', false, null, null, null, null, null, null, 'Respiratory infection', 'Coughing', 'Amoxicillin', '2025-11-15', '2025-11-18', 'oral', 20.0, 'mg/kg', 1, 3, 'approved'],
      [entityIds[3], farmId, farmerId, 'goat', 'antibiotic', false, null, null, null, null, 'VET12345', 'Dr. Smith', 'Wound infection', 'Cut on leg', 'Gentamicin', '2025-11-20', '2025-11-25', 'injection', 3.0, 'mg/kg', 1, 5, 'approved']
    ];

    const treatmentIds = [];
    for (const treatment of treatments) {
      const [treatmentResult] = await db.execute(`
        INSERT IGNORE INTO treatment_records
        (entity_id, farm_id, user_id, species, medication_type, is_vaccine, vaccine_interval_days, vaccine_total_months, next_due_date, vaccine_end_date, vet_id, vet_name, reason, cause, medicine, start_date, end_date, route, dose_amount, dose_unit, frequency_per_day, duration_days, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, treatment);
      treatmentIds.push(treatmentResult.insertId);
    }

    // Insert AMU records
    const amuRecords = [
      [treatmentIds[0], entityIds[0], farmId, farmerId, 'cattle', 'antibiotic', 'meat', 'Enrofloxacin', 'enrofloxacin', 'bacterial', 'Bacterial infection', 'Fever', 'oral', 5.0, 'mg/kg', 1, 5, '2025-11-01', '2025-11-05', 0.0, 28, '2025-12-03', 85.5, 0, 'borderline', 'muscle', '1.0'],
      [treatmentIds[1], entityIds[1], farmId, farmerId, 'cattle', 'antibiotic', 'milk', 'Tetracycline', 'tetracycline', 'bacterial', 'Mastitis', 'Udder inflammation', 'injection', 10.0, 'mg/kg', 2, 7, '2025-11-10', '2025-11-17', 0.0, 7, '2025-11-24', 25.0, 0, 'safe', 'milk', '1.0'],
      [treatmentIds[2], entityIds[2], farmId, farmerId, 'poultry', 'antibiotic', 'meat', 'Amoxicillin', 'amoxicillin', 'bacterial', 'Respiratory infection', 'Coughing', 'oral', 20.0, 'mg/kg', 1, 3, '2025-11-15', '2025-11-18', 0.0, 3, '2025-11-21', 120.5, 0, 'unsafe', 'liver', '1.0'],
      [treatmentIds[3], entityIds[3], farmId, farmerId, 'goat', 'antibiotic', 'meat', 'Gentamicin', 'gentamicin', 'bacterial', 'Wound infection', 'Cut on leg', 'injection', 3.0, 'mg/kg', 1, 5, '2025-11-20', '2025-11-25', 0.0, 14, '2025-12-09', 15.2, 0, 'safe', 'kidney', '1.0']
    ];

    for (const amu of amuRecords) {
      await db.execute(`
        INSERT IGNORE INTO amu_records
        (treatment_id, entity_id, farm_id, user_id, species, medication_type, matrix, medicine, active_ingredient, category_type, reason, cause, route, dose_amount, dose_unit, frequency_per_day, duration_days, start_date, end_date, predicted_mrl, predicted_withdrawal_days, safe_date, risk_percent, overdosage, risk_category, worst_tissue, model_version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, amu);
    }

    console.log('Sample data population completed successfully!');
    console.log('Created sample users, farmers, vets, farms, entities, treatments, and AMU records.');

  } catch (error) {
    console.error('Error populating sample data:', error);
  } finally {
    process.exit();
  }
}

populateSampleData();