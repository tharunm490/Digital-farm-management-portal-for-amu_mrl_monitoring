const db = require('./config/database');
const bcrypt = require('bcrypt');

async function populateSampleData() {
  try {
    console.log('🚀 Starting sample data population...');

    // Create sample users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Insert authority user
    console.log('Creating authority user...');
    await db.execute(`
      INSERT INTO users (email, password_hash, display_name, role, phone, auth_provider, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE email=email
    `, ['authority@example.com', hashedPassword, 'Authority User', 'authority', '9999999999', 'local']);
    
    const [authUsers] = await db.execute(`SELECT user_id FROM users WHERE email = ?`, ['authority@example.com']);
    const authorityId = authUsers[0].user_id;

    // Insert farmer users (with location in users table)
    console.log('Creating farmer users...');
    
    const farmerData = [
      ['farmer1@example.com', 'Rajesh Kumar', 'Karnataka', 'Udupi', 'Udupi', '9876543210', '123456789013'],
      ['farmer2@example.com', 'Suresh Patel', 'Karnataka', 'Udupi', 'Karkala', '9876543211', '123456789014'],
      ['farmer3@example.com', 'Mohan Rao', 'Karnataka', 'Dakshina Kannada', 'Mangalore', '9876543212', '123456789015']
    ];
    
    const farmerUserIds = [];
    for (const farmer of farmerData) {
      await db.execute(`
        INSERT INTO users (email, password_hash, display_name, role, state, district, taluk, phone, aadhaar_number, created_at)
        VALUES (?, ?, ?, 'farmer', ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE email=email
      `, [farmer[0], hashedPassword, farmer[1], farmer[2], farmer[3], farmer[4], farmer[5], farmer[6]]);
      
      const [farmerUser] = await db.execute(`SELECT user_id FROM users WHERE email = ?`, [farmer[0]]);
      if (!farmerUser || !farmerUser[0]) {
        throw new Error(`Failed to create/find farmer user: ${farmer[0]}`);
      }
      farmerUserIds.push(farmerUser[0].user_id);
    }

    // Insert veterinarian user (with location in users table)
    console.log('Creating veterinarian user...');
    await db.execute(`
      INSERT INTO users (email, password_hash, display_name, role, state, district, taluk, phone, auth_provider, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE email=email
    `, ['vet@example.com', hashedPassword, 'Sample Vet', 'veterinarian', 'Karnataka', 'Udupi', 'Udupi', '9876543211', 'local']);
    
    const [vetUsers] = await db.execute(`SELECT user_id FROM users WHERE email = ?`, ['vet@example.com']);
    const vetUserId = vetUsers[0].user_id;

    // Insert farmer profiles (no location - those are in users table)
    console.log('Creating farmer profiles...');
    const farmerIds = [];
    
    for (let i = 0; i < farmerUserIds.length; i++) {
      await db.execute(`
        INSERT INTO farmers (user_id, address)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE user_id=user_id
      `, [farmerUserIds[i], `Farm Address ${i+1}, Karnataka`]);
      
      const [farmers] = await db.execute(`SELECT farmer_id FROM farmers WHERE user_id = ?`, [farmerUserIds[i]]);
      farmerIds.push(farmers[0].farmer_id);
    }

    // Insert vet profile
    console.log('Creating veterinarian profile...');
    await db.execute(`
      INSERT INTO veterinarians (vet_id, user_id, vet_name, license_number, phone)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE vet_id=vet_id
    `, ['VET12345', vetUserId, 'Dr. Smith', 'VET12345', '9876543211']);

    // Insert farms with different locations
    console.log('Creating farms...');
    const farmData = [
      [farmerIds[0], 'Green Valley Farm', 13.0827, 74.7482],  // Udupi
      [farmerIds[0], 'Sunrise Dairy', 13.0920, 74.7580],      // Udupi (2nd farm)
      [farmerIds[1], 'Hill View Poultry', 13.2119, 74.9880],  // Karkala
      [farmerIds[2], 'Coastal Cattle Ranch', 12.9141, 74.8560] // Mangalore
    ];
    
    const farmIds = [];
    for (const farm of farmData) {
      await db.execute(`
        INSERT INTO farms (farmer_id, farm_name, latitude, longitude, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `, farm);
      const [lastFarm] = await db.execute(`SELECT LAST_INSERT_ID() as id`);
      farmIds.push(lastFarm[0].id);
    }

    // Insert vet-farm mappings
    console.log('Creating vet-farm mappings...');
    for (const fId of farmIds) {
      await db.execute(`
        INSERT INTO vet_farm_mapping (vet_id, farm_id)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE vet_id=vet_id
      `, ['VET12345', fId]);
    }

    // Insert entities (animals/batches) across all farms
    console.log('Creating animals/batches...');
    const entityInserts = [
      // Farm 1 - Green Valley Farm (cattle focus)
      [farmIds[0], 'animal', 'cattle', 'TAG001', null, 1, 'meat'],
      [farmIds[0], 'animal', 'cattle', 'TAG002', null, 1, 'milk'],
      [farmIds[0], 'animal', 'cattle', 'TAG003', null, 1, 'meat'],
      // Farm 2 - Sunrise Dairy (cattle milk)
      [farmIds[1], 'animal', 'cattle', 'TAG004', null, 1, 'milk'],
      [farmIds[1], 'animal', 'cattle', 'TAG005', null, 1, 'milk'],
      // Farm 3 - Hill View Poultry
      [farmIds[2], 'batch', 'poultry', null, 'Batch001', 100, 'meat'],
      [farmIds[2], 'batch', 'poultry', null, 'Batch002', 150, 'egg'],
      // Farm 4 - Coastal Cattle Ranch
      [farmIds[3], 'animal', 'cattle', 'TAG006', null, 1, 'meat'],
      [farmIds[3], 'animal', 'goat', 'TAG007', null, 1, 'meat']
    ];

    const entityIds = [];
    for (const entity of entityInserts) {
      await db.execute(`
        INSERT INTO animals_or_batches
        (farm_id, entity_type, species, tag_id, batch_name, batch_count, matrix)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, entity);
      const [lastEntity] = await db.execute(`SELECT LAST_INSERT_ID() as id`);
      entityIds.push(lastEntity[0].id);
    }

    // Insert treatment records
    console.log('Creating treatment records...');
    const treatments = [
      // Farm 1 - cattle treatments
      [entityIds[0], farmIds[0], farmerUserIds[0], 'cattle', 'antibiotic', false, null, null, null, null, 'VET12345', 'Dr. Smith', 'Bacterial infection', 'Fever and lethargy', 'Enrofloxacin', '2025-11-01', '2025-11-05', 'oral', 5.0, 'mg/kg', 1, 5, 'approved'],
      [entityIds[1], farmIds[0], farmerUserIds[0], 'cattle', 'antibiotic', false, null, null, null, null, 'VET12345', 'Dr. Smith', 'Mastitis', 'Udder inflammation', 'Tetracycline', '2025-11-10', '2025-11-17', 'IM', 10.0, 'mg/kg', 2, 7, 'approved'],
      [entityIds[2], farmIds[0], farmerUserIds[0], 'cattle', 'antibiotic', false, null, null, null, null, 'VET12345', 'Dr. Smith', 'Respiratory infection', 'Coughing', 'Amoxicillin', '2025-11-20', '2025-11-25', 'oral', 15.0, 'mg/kg', 1, 5, 'approved'],
      // Farm 2 - cattle dairy
      [entityIds[3], farmIds[1], farmerUserIds[0], 'cattle', 'antibiotic', false, null, null, null, null, 'VET12345', 'Dr. Smith', 'Mastitis', 'Udder swelling', 'Tetracycline', '2025-11-12', '2025-11-19', 'IM', 12.0, 'mg/kg', 2, 7, 'approved'],
      [entityIds[4], farmIds[1], farmerUserIds[0], 'cattle', 'antibiotic', false, null, null, null, null, 'VET12345', 'Dr. Smith', 'Foot infection', 'Limping', 'Penicillin', '2025-11-18', '2025-11-23', 'IM', 8.0, 'mg/kg', 1, 5, 'approved'],
      // Farm 3 - poultry
      [entityIds[5], farmIds[2], farmerUserIds[1], 'poultry', 'antibiotic', false, null, null, null, null, null, null, 'Respiratory infection', 'Coughing and sneezing', 'Amoxicillin', '2025-11-15', '2025-11-18', 'water', 20.0, 'mg/kg', 1, 3, 'approved'],
      [entityIds[6], farmIds[2], farmerUserIds[1], 'poultry', 'antibiotic', false, null, null, null, null, null, null, 'Bacterial infection', 'Low egg production', 'Enrofloxacin', '2025-11-22', '2025-11-26', 'water', 10.0, 'mg/kg', 1, 4, 'approved'],
      // Farm 4 - cattle and goat
      [entityIds[7], farmIds[3], farmerUserIds[2], 'cattle', 'antibiotic', false, null, null, null, null, 'VET12345', 'Dr. Smith', 'Bacterial infection', 'High fever', 'Gentamicin', '2025-11-08', '2025-11-13', 'IV', 4.0, 'mg/kg', 1, 5, 'approved'],
      [entityIds[8], farmIds[3], farmerUserIds[2], 'goat', 'antibiotic', false, null, null, null, null, 'VET12345', 'Dr. Smith', 'Wound infection', 'Cut on leg', 'Gentamicin', '2025-11-20', '2025-11-25', 'IM', 3.0, 'mg/kg', 1, 5, 'approved']
    ];

    const treatmentIds = [];
    for (const treatment of treatments) {
      await db.execute(`
        INSERT INTO treatment_records
        (entity_id, farm_id, user_id, species, medication_type, is_vaccine, vaccine_interval_days, vaccine_total_months, next_due_date, vaccine_end_date, vet_id, vet_name, reason, cause, medicine, start_date, end_date, route, dose_amount, dose_unit, frequency_per_day, duration_days, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, treatment);
      const [lastTreatment] = await db.execute(`SELECT LAST_INSERT_ID() as id`);
      treatmentIds.push(lastTreatment[0].id);
    }

    // Insert AMU records
    console.log('Creating AMU records...');
    const amuRecords = [
      // Farm 1 treatments
      [treatmentIds[0], entityIds[0], farmIds[0], farmerUserIds[0], 'cattle', 'antibiotic', 'meat', 'Enrofloxacin', 'enrofloxacin', 'bacterial', 'Bacterial infection', 'Fever', 'oral', 5.0, 'mg/kg', 1, 5, '2025-11-01', '2025-11-05', 0.0, 28, '2025-12-03', 85.5, 0, 'borderline', 'muscle', '1.0'],
      [treatmentIds[1], entityIds[1], farmIds[0], farmerUserIds[0], 'cattle', 'antibiotic', 'milk', 'Tetracycline', 'tetracycline', 'bacterial', 'Mastitis', 'Udder inflammation', 'IM', 10.0, 'mg/kg', 2, 7, '2025-11-10', '2025-11-17', 0.0, 7, '2025-11-24', 25.0, 0, 'safe', null, '1.0'],
      [treatmentIds[2], entityIds[2], farmIds[0], farmerUserIds[0], 'cattle', 'antibiotic', 'meat', 'Amoxicillin', 'amoxicillin', 'bacterial', 'Respiratory infection', 'Coughing', 'oral', 15.0, 'mg/kg', 1, 5, '2025-11-20', '2025-11-25', 0.0, 10, '2025-12-05', 45.0, 0, 'safe', 'muscle', '1.0'],
      // Farm 2 treatments
      [treatmentIds[3], entityIds[3], farmIds[1], farmerUserIds[0], 'cattle', 'antibiotic', 'milk', 'Tetracycline', 'tetracycline', 'bacterial', 'Mastitis', 'Udder swelling', 'IM', 12.0, 'mg/kg', 2, 7, '2025-11-12', '2025-11-19', 0.0, 8, '2025-11-27', 30.0, 0, 'safe', null, '1.0'],
      [treatmentIds[4], entityIds[4], farmIds[1], farmerUserIds[0], 'cattle', 'antibiotic', 'milk', 'Penicillin', 'penicillin', 'bacterial', 'Foot infection', 'Limping', 'IM', 8.0, 'mg/kg', 1, 5, '2025-11-18', '2025-11-23', 0.0, 5, '2025-11-28', 20.0, 0, 'safe', null, '1.0'],
      // Farm 3 treatments (poultry - high risk)
      [treatmentIds[5], entityIds[5], farmIds[2], farmerUserIds[1], 'poultry', 'antibiotic', 'meat', 'Amoxicillin', 'amoxicillin', 'bacterial', 'Respiratory infection', 'Coughing', 'water', 20.0, 'mg/kg', 1, 3, '2025-11-15', '2025-11-18', 0.0, 3, '2025-11-21', 95.5, 0, 'unsafe', 'liver', '1.0'],
      [treatmentIds[6], entityIds[6], farmIds[2], farmerUserIds[1], 'poultry', 'antibiotic', 'egg', 'Enrofloxacin', 'enrofloxacin', 'bacterial', 'Bacterial infection', 'Low production', 'water', 10.0, 'mg/kg', 1, 4, '2025-11-22', '2025-11-26', 0.0, 7, '2025-12-03', 75.0, 0, 'borderline', null, '1.0'],
      // Farm 4 treatments
      [treatmentIds[7], entityIds[7], farmIds[3], farmerUserIds[2], 'cattle', 'antibiotic', 'meat', 'Gentamicin', 'gentamicin', 'bacterial', 'Bacterial infection', 'High fever', 'IV', 4.0, 'mg/kg', 1, 5, '2025-11-08', '2025-11-13', 0.0, 14, '2025-11-27', 65.0, 0, 'borderline', 'kidney', '1.0'],
      [treatmentIds[8], entityIds[8], farmIds[3], farmerUserIds[2], 'goat', 'antibiotic', 'meat', 'Gentamicin', 'gentamicin', 'bacterial', 'Wound infection', 'Cut on leg', 'IM', 3.0, 'mg/kg', 1, 5, '2025-11-20', '2025-11-25', 0.0, 14, '2025-12-09', 15.2, 0, 'safe', 'kidney', '1.0']
    ];

    for (const amu of amuRecords) {
      await db.execute(`
        INSERT INTO amu_records
        (treatment_id, entity_id, farm_id, user_id, species, medication_type, matrix, medicine, active_ingredient, category_type, reason, cause, route, dose_amount, dose_unit, frequency_per_day, duration_days, start_date, end_date, predicted_mrl, predicted_withdrawal_days, safe_date, risk_percent, overdosage, risk_category, worst_tissue, model_version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, amu);
    }

    console.log('✅ Sample data population completed successfully!');
    console.log('Created:');
    console.log('  - Authority user: authority@example.com / password123');
    console.log('  - 3 Farmer users: farmer1@example.com, farmer2@example.com, farmer3@example.com / password123');
    console.log('  - Veterinarian user: vet@example.com / password123');
    console.log('  - 4 farms across Udupi and Dakshina Kannada districts');
    console.log('  - 9 animals/batches (5 cattle, 2 poultry batches, 1 goat)');
    console.log('  - 9 treatment records');
    console.log('  - 9 AMU records (5 safe, 2 borderline, 2 unsafe)');

  } catch (error) {
    console.error('❌ Error populating sample data:', error);
    console.error('Error details:', error.message);
  } finally {
    await db.end();
    process.exit();
  }
}

populateSampleData();