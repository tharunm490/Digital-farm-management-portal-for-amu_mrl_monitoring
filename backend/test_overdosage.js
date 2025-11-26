// Test script for overdosage logic with varying extents
const { predictTissueMrl } = require('./utils/amuTissueService');

console.log('Testing overdosage logic with varying extents...');

// Test 1: 2x overdosage
console.log('\n=== Test 1: 2x Overdosage (doseAmount=2.2) ===');
const testParams1 = {
  species: 'cattle',
  category: 'anti-inflammatory',
  medicine: 'Prednisolone',
  doseAmount: 2.2, // 2.2 / 1.1 ≈ 2x
  doseUnit: 'mg/kg',
  durationDays: 3,
  matrix: 'meat',
  endDate: '2025-11-26',
  currentDate: '2025-11-26',
  frequencyPerDay: 1
};

const result1 = predictTissueMrl(
  testParams1.species,
  testParams1.category,
  testParams1.medicine,
  testParams1.doseAmount,
  testParams1.doseUnit,
  testParams1.durationDays,
  testParams1.matrix,
  testParams1.endDate,
  testParams1.currentDate,
  testParams1.frequencyPerDay
);

console.log('Result:', JSON.stringify(result1, null, 2));
console.log('Withdrawal days:', result1.predicted_withdrawal_days);
console.log('Expected: base(6) * 2 = 12');

// Test 2: 3x overdosage
console.log('\n=== Test 2: 3x Overdosage (doseAmount=3.3) ===');
const testParams2 = {
  species: 'cattle',
  category: 'anti-inflammatory',
  medicine: 'Prednisolone',
  doseAmount: 3.3, // 3.3 / 1.1 ≈ 3x
  doseUnit: 'mg/kg',
  durationDays: 3,
  matrix: 'meat',
  endDate: '2025-11-26',
  currentDate: '2025-11-26',
  frequencyPerDay: 1
};

const result2 = predictTissueMrl(
  testParams2.species,
  testParams2.category,
  testParams2.medicine,
  testParams2.doseAmount,
  testParams2.doseUnit,
  testParams2.durationDays,
  testParams2.matrix,
  testParams2.endDate,
  testParams2.currentDate,
  testParams2.frequencyPerDay
);

console.log('Result:', JSON.stringify(result2, null, 2));
console.log('Withdrawal days:', result2.predicted_withdrawal_days);
console.log('Expected: base(6) * 3 = 18');

// Test 3: 4x overdosage
console.log('\n=== Test 3: 4x Overdosage (doseAmount=4.4) ===');
const testParams3 = {
  species: 'cattle',
  category: 'anti-inflammatory',
  medicine: 'Prednisolone',
  doseAmount: 4.4, // 4.4 / 1.1 ≈ 4x
  doseUnit: 'mg/kg',
  durationDays: 3,
  matrix: 'meat',
  endDate: '2025-11-26',
  currentDate: '2025-11-26',
  frequencyPerDay: 1
};

const result3 = predictTissueMrl(
  testParams3.species,
  testParams3.category,
  testParams3.medicine,
  testParams3.doseAmount,
  testParams3.doseUnit,
  testParams3.durationDays,
  testParams3.matrix,
  testParams3.endDate,
  testParams3.currentDate,
  testParams3.frequencyPerDay
);

console.log('Result:', JSON.stringify(result3, null, 2));
console.log('Withdrawal days:', result3.predicted_withdrawal_days);
console.log('Expected: base(6) * 4 = 24');