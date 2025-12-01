const db = require('./config/database');

async function testLoanDetail() {
  const loanId = 1;
  
  try {
    console.log('Testing loan detail query for loan_id:', loanId);
    
    const [loanInfo] = await db.query(
      `SELECT lr.loan_id,
              lr.purpose,
              lr.amount_requested,
              lr.status,
              lr.description,
              lr.created_at,
              lr.farm_id,
              lr.action_by,
              lr.action_date,
              lr.authority_department,
              lr.authority_designation,
              u.display_name AS farmer_name,
              fm.phone,
              fm.state,
              fm.district,
              fm.taluk,
              f.farm_name,
              au.display_name AS action_by_name
       FROM loan_requests lr
       JOIN farmers fm ON lr.farmer_id = fm.farmer_id
       JOIN users u ON fm.user_id = u.user_id
       JOIN farms f ON lr.farm_id = f.farm_id
       LEFT JOIN users au ON lr.action_by = au.user_id
       WHERE lr.loan_id = ?`,
      [loanId]
    );
    
    console.log('Loan Info Result:', JSON.stringify(loanInfo, null, 2));
    console.log('Number of results:', loanInfo.length);
    
    if (loanInfo.length > 0) {
      const loan = loanInfo[0];
      const farmId = loan.farm_id;
      
      console.log('\nTesting animal counts for farm_id:', farmId);
      const [animalCounts] = await db.query(
        `SELECT species, COUNT(*) AS animal_count
         FROM animals_or_batches
         WHERE farm_id = ?
         GROUP BY species`,
        [farmId]
      );
      console.log('Animal Counts:', JSON.stringify(animalCounts, null, 2));
      
      console.log('\nTesting treatment count for farm_id:', farmId);
      const [treatmentCount] = await db.query(
        `SELECT COUNT(*) AS total_treatments
         FROM treatment_records
         WHERE farm_id = ?`,
        [farmId]
      );
      console.log('Treatment Count:', JSON.stringify(treatmentCount, null, 2));
    }
    
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
  }
  process.exit(0);
}

testLoanDetail();
