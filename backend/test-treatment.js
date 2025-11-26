const Treatment = require('./models/Treatment');

// Test data from the form
const testData = {
  entity_id: 1, // Assuming entity_id for Tag-01-Cow02
  user_id: 1, // Assuming user_id
  medication_type: 'Antibiotic',
  medicine: 'Gentamicin',
  dose_amount: 9.1,
  dose_unit: 'mg/kg',
  route: 'Intramuscular (IM)',
  frequency_per_day: 1,
  duration_days: 3,
  start_date: '26-11-2025',
  end_date: '29-11-2025',
  vet_id: 1289456,
  vet_name: 'Bikram',
  reason: 'Infection',
  cause: 'Bacterial'
};

async function testTreatmentCreation() {
  try {
    console.log('Testing treatment creation with data:', testData);
    const treatmentId = await Treatment.create(testData);
    console.log('Treatment created successfully with ID:', treatmentId);
  } catch (error) {
    console.error('Error creating treatment:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testTreatmentCreation();