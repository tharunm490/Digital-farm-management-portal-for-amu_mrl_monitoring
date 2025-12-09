const db = require('./backend/config/database');

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function testSmartAssignment() {
  try {
    console.log('🧪 Testing Smart Lab Assignment Logic\n');
    
    // Get a sample treatment case
    const [cases] = await db.execute(`
      SELECT tr.treatment_id, tr.entity_id, f.farmer_id,
             f.farm_id, f.farm_name, f.latitude as farm_lat, f.longitude as farm_lon,
             f.district, f.state, tr.end_date as safe_date
      FROM treatment_records tr
      JOIN animals_or_batches a ON a.entity_id = tr.entity_id
      JOIN farms f ON f.farm_id = a.farm_id
      WHERE tr.treatment_id NOT IN (SELECT DISTINCT treatment_id FROM sample_requests WHERE treatment_id IS NOT NULL)
      LIMIT 1
    `);

    if (cases.length === 0) {
      console.log('❌ No treatment cases available for testing');
      return;
    }

    const testCase = cases[0];
    console.log('📋 Test Case:');
    console.log(`   Treatment ID: ${testCase.treatment_id}`);
    console.log(`   Farm: ${testCase.farm_name} (${testCase.district}, ${testCase.state})`);
    console.log(`   Farm Coordinates: ${testCase.farm_lat}, ${testCase.farm_lon}`);
    console.log(`   Safe Date: ${testCase.safe_date}\n`);

    // Get all labs with coordinates
    const [labs] = await db.execute(`
      SELECT lab_id, lab_name, latitude, longitude, district, state
      FROM laboratories
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `);

    console.log(`🔍 Found ${labs.length} laboratories with coordinates\n`);

    if (labs.length > 0 && testCase.farm_lat && testCase.farm_lon) {
      // Calculate distances
      const labsWithDistance = labs.map(lab => ({
        ...lab,
        distance: calculateDistance(testCase.farm_lat, testCase.farm_lon, lab.latitude, lab.longitude)
      }));

      labsWithDistance.sort((a, b) => a.distance - b.distance);

      console.log('📊 Lab Distances (nearest first):');
      labsWithDistance.forEach((lab, index) => {
        const status = lab.distance <= 200 ? '✅ Within range' : '❌ Too far';
        console.log(`   ${index + 1}. ${lab.lab_name} (${lab.district}, ${lab.state})`);
        console.log(`      Distance: ${lab.distance.toFixed(2)} km ${status}`);
      });

      const nearestLab = labsWithDistance[0];
      if (nearestLab.distance <= 200) {
        console.log(`\n✅ ASSIGNMENT: ${nearestLab.lab_name} (${nearestLab.distance.toFixed(2)} km away)`);
      } else {
        console.log(`\n⚠️ Nearest lab is ${nearestLab.distance.toFixed(2)} km away (exceeds 200 km limit)`);
        console.log(`   Will fall back to district/state/default matching`);
      }
    } else {
      console.log('⚠️ No coordinates available for distance calculation');
      console.log('   Will use district/state/default matching');
    }

    console.log('\n🎯 Smart Assignment Logic:');
    console.log('   1️⃣ Find nearest lab within 200 km (if coordinates available)');
    console.log('   2️⃣ Find lab in same district');
    console.log('   3️⃣ Find lab in same state');
    console.log('   4️⃣ Assign to default lab (first available)');

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}

testSmartAssignment();
