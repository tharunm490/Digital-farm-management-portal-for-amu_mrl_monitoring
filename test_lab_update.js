#!/usr/bin/env node

/**
 * TEST SCRIPT: Laboratory Profile Database Update Verification
 * 
 * This script tests:
 * 1. Database connection
 * 2. Laboratory table exists
 * 3. Lab data retrieval
 * 4. Lab data update
 * 5. Data persistence
 */

require('dotenv').config({ path: require('path').join(__dirname, 'backend/.env') });
const db = require('./backend/config/database');
const Laboratory = require('./backend/models/Laboratory');

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 LABORATORY PROFILE DATABASE UPDATE TEST');
  console.log('='.repeat(70) + '\n');

  try {
    // Test 1: Database Connection
    console.log('📍 Test 1: Database Connection');
    const testQuery = 'SELECT 1 as test';
    const [result] = await db.execute(testQuery);
    console.log('✅ Database connection successful\n');

    // Test 2: Check laboratories table
    console.log('📍 Test 2: Laboratories Table Structure');
    const [tableInfo] = await db.execute('DESCRIBE laboratories');
    console.log('✅ Laboratories table exists with columns:');
    tableInfo.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });
    console.log();

    // Test 3: Fetch lab data
    console.log('📍 Test 3: Fetch Laboratory Profile (user_id = 4)');
    const [labs] = await db.execute('SELECT * FROM laboratories WHERE user_id = 4 LIMIT 1');
    
    if (labs.length === 0) {
      console.log('⚠️  No laboratory profile found for user_id 4');
      console.log('   Creating test profile...\n');
      
      const insertQuery = `
        INSERT INTO laboratories (user_id, lab_name, license_number, phone, email, state, district, taluk, address)
        VALUES (4, 'Test Lab', 'LIC-2024-001', '9876543210', 'test@lab.com', 'Karnataka', 'Bengaluru', 'Bengaluru', '123 Lab Street')
      `;
      await db.execute(insertQuery);
      console.log('✅ Test profile created\n');
    } else {
      const lab = labs[0];
      console.log('✅ Laboratory profile found:');
      console.log('   Lab ID:', lab.lab_id);
      console.log('   Name:', lab.lab_name);
      console.log('   Phone:', lab.phone);
      console.log('   License:', lab.license_number);
      console.log('\n');
    }

    // Test 4: Update lab data
    console.log('📍 Test 4: Update Laboratory Profile');
    const [updateLabs] = await db.execute('SELECT * FROM laboratories WHERE user_id = 4 LIMIT 1');
    
    if (updateLabs.length > 0) {
      const lab = updateLabs[0];
      const testPhone = '8765432109';
      const testName = 'Updated Test Lab ' + Date.now();
      
      console.log(`Updating lab_id ${lab.lab_id}:`);
      console.log(`   Old Phone: ${lab.phone}`);
      console.log(`   New Phone: ${testPhone}`);
      console.log(`   Old Name: ${lab.lab_name}`);
      console.log(`   New Name: ${testName}`);
      
      const updateQuery = `UPDATE laboratories SET lab_name = ?, phone = ? WHERE lab_id = ?`;
      const [updateResult] = await db.execute(updateQuery, [testName, testPhone, lab.lab_id]);
      
      console.log(`\n✅ Update executed: ${updateResult.affectedRows} rows affected\n`);

      // Test 5: Verify update
      console.log('📍 Test 5: Verify Data Persistence');
      const [verifyLabs] = await db.execute('SELECT * FROM laboratories WHERE lab_id = ?', [lab.lab_id]);
      
      if (verifyLabs.length > 0) {
        const updated = verifyLabs[0];
        console.log('✅ Data retrieved after update:');
        console.log('   Lab ID:', updated.lab_id);
        console.log('   Name:', updated.lab_name);
        console.log('   Phone:', updated.phone);
        
        if (updated.phone === testPhone && updated.lab_name === testName) {
          console.log('\n✅ DATA PERSISTENCE VERIFIED - Update successful!\n');
        } else {
          console.log('\n❌ DATA MISMATCH - Update may have failed\n');
          console.log('Expected phone:', testPhone, 'Got:', updated.phone);
          console.log('Expected name:', testName, 'Got:', updated.lab_name);
        }
      } else {
        console.log('❌ Could not retrieve lab after update\n');
      }
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    console.log('='.repeat(70));
    console.log('Test Complete\n');
    process.exit(0);
  }
}

// Run tests
runTests();
