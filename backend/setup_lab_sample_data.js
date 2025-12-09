/**
 * LABORATORY DASHBOARD - SAMPLE DATA SETUP SCRIPT
 * 
 * This script creates sample data for testing the complete laboratory workflow
 * Run this AFTER having sample users, farms, and treatments already created
 */

const db = require('./config/database');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n`)
};

async function setupSampleData() {
  try {
    log.section('LABORATORY DASHBOARD - SAMPLE DATA SETUP');

    // Prerequisites: You need these IDs from your database
    const LAB_ID = 1;
    const FARMER_ID = 1;
    const ENTITY_ID = 1;
    const TREATMENT_ID = 1;

    // 1️⃣ Create Sample Requests (Pending)
    log.section('STEP 1: Create Sample Requests (Status: requested)');
    
    const sampleDates = [
      new Date('2025-10-18'),
      new Date('2025-10-20'),
      new Date('2025-10-22'),
      new Date('2025-10-25'),
      new Date('2025-11-01')
    ];

    const sampleRequestIds = [];

    for (let i = 0; i < sampleDates.length; i++) {
      const [result] = await db.execute(
        `INSERT INTO sample_requests (treatment_id, farmer_id, entity_id, assigned_lab_id, safe_date, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'requested', NOW())`,
        [TREATMENT_ID, FARMER_ID, ENTITY_ID, LAB_ID, sampleDates[i]]
      );
      sampleRequestIds.push(result.insertId);
      log.success(`Created sample request ID: ${result.insertId}`);
    }

    // 2️⃣ Simulate Sample Collection for first request
    log.section('STEP 2: Simulate Sample Collection (Status: collected)');
    
    const collectedSampleId = sampleRequestIds[0];
    const [sampleResult] = await db.execute(
      `INSERT INTO samples (sample_request_id, sample_type, collected_date, collected_by_lab_id, remarks)
       VALUES (?, ?, ?, ?, ?)`,
      [collectedSampleId, 'milk', new Date(), LAB_ID, 'Collected during morning milking']
    );
    const sampleId = sampleResult.insertId;
    log.success(`Created sample ID: ${sampleId}`);

    // Update request status to collected
    await db.execute(
      'UPDATE sample_requests SET status = ? WHERE sample_request_id = ?',
      ['collected', collectedSampleId]
    );
    log.success(`Updated request ${collectedSampleId} status to 'collected'`);

    // 3️⃣ Simulate Lab Testing
    log.section('STEP 3: Simulate Lab Testing (Status: tested)');
    
    const testScenarios = [
      {
        sampleId: sampleId,
        residue: 0.35,
        mrlLimit: 0.50,
        status: 'safe',
        days: 0,
        remarks: 'Residue within safe limit - Can consume immediately'
      },
      {
        sampleId: sampleId + 1,
        residue: 0.45,
        mrlLimit: 0.50,
        status: 'borderline',
        days: 2,
        remarks: 'Residue approaching limit - Recommend 2 days withdrawal'
      },
      {
        sampleId: sampleId + 2,
        residue: 0.65,
        mrlLimit: 0.50,
        status: 'unsafe',
        days: 7,
        remarks: 'Residue exceeds safe limit - Requires 7 days withdrawal'
      }
    ];

    for (const scenario of testScenarios) {
      const [reportResult] = await db.execute(
        `INSERT INTO lab_test_reports (
          sample_id, lab_id, detected_residue, mrl_limit,
          withdrawal_days_remaining, final_status, tested_on, remarks, certificate_url
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
        [
          scenario.sampleId || sampleId,
          LAB_ID,
          scenario.residue,
          scenario.mrlLimit,
          scenario.days,
          scenario.status,
          scenario.remarks,
          `uploads/certificates/report_${Date.now()}_${scenario.status}.pdf`
        ]
      );
      log.success(`Created ${scenario.status.toUpperCase()} lab report ID: ${reportResult.insertId}`);
    }

    // Update request status to tested
    await db.execute(
      'UPDATE sample_requests SET status = ? WHERE sample_request_id = ?',
      ['tested', collectedSampleId]
    );
    log.success(`Updated request status to 'tested'`);

    // 4️⃣ Verify Data
    log.section('STEP 4: Verify Created Data');
    
    const [pendingCount] = await db.execute(
      'SELECT COUNT(*) as count FROM sample_requests WHERE assigned_lab_id = ? AND status = ?',
      [LAB_ID, 'requested']
    );
    console.log(`Pending requests: ${pendingCount[0].count}`);

    const [collectedCount] = await db.execute(
      'SELECT COUNT(*) as count FROM sample_requests WHERE assigned_lab_id = ? AND status = ?',
      [LAB_ID, 'collected']
    );
    console.log(`Collected samples: ${collectedCount[0].count}`);

    const [testedCount] = await db.execute(
      'SELECT COUNT(*) as count FROM sample_requests WHERE assigned_lab_id = ? AND status = ?',
      [LAB_ID, 'tested']
    );
    console.log(`Under testing: ${testedCount[0].count}`);

    const [reportCount] = await db.execute(
      'SELECT COUNT(*) as count FROM lab_test_reports WHERE lab_id = ?',
      [LAB_ID]
    );
    console.log(`Completed reports: ${reportCount[0].count}`);

    // 5️⃣ Display Sample Data
    log.section('SAMPLE DATA SUMMARY');
    
    const [reports] = await db.execute(`
      SELECT ltr.report_id, ltr.final_status, ltr.detected_residue, ltr.mrl_limit
      FROM lab_test_reports ltr
      WHERE ltr.lab_id = ?
      ORDER BY ltr.report_id DESC
      LIMIT 3
    `, [LAB_ID]);

    console.log(`\nCreated ${reports.length} test reports:`);
    reports.forEach(r => {
      console.log(`  Report #${r.report_id}: ${r.final_status.toUpperCase()} (${r.detected_residue}/${r.mrl_limit})`);
    });

    log.success('\n✅ Sample data setup completed successfully!');
    log.info('You can now test the laboratory dashboard with this sample data.');

  } catch (error) {
    log.error(`Setup error: ${error.message}`);
    console.error('Full error:', error);
  } finally {
    await db.end();
    process.exit(0);
  }
}

// Run setup
console.clear();
log.section('🧪 LABORATORY DASHBOARD - SAMPLE DATA SETUP');
log.warn('⚠️  IMPORTANT: Make sure you have sample users, farms, and treatments already created!');
log.warn('This script requires: FARMER_ID = 1, ENTITY_ID = 1, TREATMENT_ID = 1');
log.info('Edit the LAB_ID, FARMER_ID, ENTITY_ID, TREATMENT_ID values at the top if needed.\n');

setupSampleData();
