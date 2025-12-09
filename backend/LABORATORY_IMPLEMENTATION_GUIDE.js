/**
 * LABORATORY DASHBOARD IMPLEMENTATION SUMMARY
 * 
 * This document outlines the complete Laboratory Dashboard implementation
 * with all 6 sections as requested.
 */

// =====================================================================
// 1️⃣ DASHBOARD COUNTS ENDPOINT
// =====================================================================
/**
 * GET /api/labs/stats
 * 
 * Returns dashboard statistics for the logged-in lab
 * 
 * Query 1: Pending Requests
 * SELECT COUNT(*) AS pending_requests
 * FROM sample_requests
 * WHERE assigned_lab_id = LAB_ID AND status = 'requested';
 * 
 * Query 2: Samples Collected
 * SELECT COUNT(*) AS samples_collected
 * FROM sample_requests
 * WHERE assigned_lab_id = LAB_ID AND status = 'collected';
 * 
 * Query 3: Under Testing
 * SELECT COUNT(*) AS under_testing
 * FROM sample_requests
 * WHERE assigned_lab_id = LAB_ID AND status = 'tested';
 * 
 * Query 4: Completed Reports
 * SELECT COUNT(*) AS reports_completed
 * FROM lab_test_reports
 * WHERE lab_id = LAB_ID;
 * 
 * Response:
 * {
 *   "pending": 5,
 *   "collected": 2,
 *   "tested": 1,
 *   "completed": 0
 * }
 */

// =====================================================================
// 2️⃣ PENDING SAMPLE REQUESTS ENDPOINT
// =====================================================================
/**
 * GET /api/labs/pending-requests
 * 
 * Fetch all treatment records assigned to lab (after withdrawal date)
 * 
 * SQL Query:
 * SELECT sr.sample_request_id, sr.treatment_id, sr.farmer_id, sr.entity_id, sr.safe_date,
 *        a.species, a.tag_id, a.batch_name,
 *        f.farm_name, f.district, f.state,
 *        t.medicine, t.dose_amount, t.duration_days
 * FROM sample_requests sr
 * JOIN animals_or_batches a ON sr.entity_id = a.entity_id
 * JOIN farms f ON f.farm_id = a.farm_id
 * JOIN treatment_records t ON sr.treatment_id = t.treatment_id
 * WHERE sr.assigned_lab_id = LAB_ID AND sr.status = 'requested'
 * ORDER BY sr.safe_date ASC;
 * 
 * Response: Array of pending requests with animal and treatment details
 */

// =====================================================================
// 3️⃣ SAMPLE COLLECTION ENDPOINT
// =====================================================================
/**
 * POST /api/labs/collect-sample
 * 
 * Request Body:
 * {
 *   "sample_request_id": 4,
 *   "sample_type": "milk",
 *   "collected_date": "2025-12-09",
 *   "remarks": "Collected on site"
 * }
 * 
 * Step 1: Insert sample details
 * INSERT INTO samples (
 *   sample_request_id, sample_type, collected_date, collected_by_lab_id, remarks
 * ) VALUES (SAMPLE_REQUEST_ID, 'milk', CURDATE(), LAB_ID, 'Collected on site');
 * 
 * Step 2: Update request status
 * UPDATE sample_requests 
 * SET status = 'collected' 
 * WHERE sample_request_id = SAMPLE_REQUEST_ID;
 * 
 * Response:
 * {
 *   "message": "Sample collected",
 *   "sample_id": 123
 * }
 */

// =====================================================================
// 4️⃣ UPLOAD LAB TEST REPORT ENDPOINT
// =====================================================================
/**
 * POST /api/labs/upload-report
 * 
 * Request Body:
 * {
 *   "sample_id": 123,
 *   "detected_residue": 0.35,
 *   "mrl_limit": 0.50,
 *   "withdrawal_days_remaining": 0,
 *   "final_status": "safe",
 *   "tested_on": "2025-12-09",
 *   "remarks": "Residue within limit",
 *   "certificate_url": "uploads/certificates/report123.pdf"
 * }
 * 
 * Step 1: Insert final lab test result
 * INSERT INTO lab_test_reports (
 *   sample_id, lab_id, detected_residue, mrl_limit,
 *   withdrawal_days_remaining, final_status, tested_on, remarks, certificate_url
 * ) VALUES (SAMPLE_ID, LAB_ID, 0.35, 0.50, 0, 'safe', CURDATE(), 'Residue within limit',
 *   'uploads/certificates/report123.pdf');
 * 
 * Step 2: Update sample request status to tested
 * UPDATE sample_requests 
 * SET status = 'tested'
 * WHERE sample_request_id = (SELECT sample_request_id FROM samples WHERE sample_id = SAMPLE_ID);
 * 
 * Response:
 * {
 *   "message": "Report uploaded",
 *   "report_id": 456
 * }
 */

// =====================================================================
// 5️⃣ ALL REPORTS (LAB VIEW) ENDPOINT
// =====================================================================
/**
 * GET /api/labs/all-reports
 * 
 * SQL Query:
 * SELECT ltr.report_id, ltr.final_status, ltr.tested_on,
 *        ltr.detected_residue, ltr.mrl_limit, ltr.withdrawal_days_remaining,
 *        ltr.remarks, ltr.certificate_url,
 *        a.species, t.medicine, f.farm_name, u.display_name AS farmer_name,
 *        s.sample_id, s.sample_type, s.collected_date
 * FROM lab_test_reports ltr
 * JOIN samples s ON s.sample_id = ltr.sample_id
 * JOIN sample_requests sr ON sr.sample_request_id = s.sample_request_id
 * JOIN treatment_records t ON sr.treatment_id = t.treatment_id
 * JOIN animals_or_batches a ON a.entity_id = sr.entity_id
 * JOIN farmers fr ON sr.farmer_id = fr.farmer_id
 * JOIN users u ON fr.user_id = u.user_id
 * JOIN farms f ON t.farm_id = f.farm_id
 * WHERE ltr.lab_id = LAB_ID
 * ORDER BY ltr.tested_on DESC;
 * 
 * Response: Array of all completed test reports for this lab
 */

// =====================================================================
// 6️⃣ AUTHORITY LAB RECORDS VIEW ENDPOINTS
// =====================================================================
/**
 * GET /api/labs/authority/all-lab-reports
 * 
 * Authorities can view all reports from all labs
 * 
 * SQL Query:
 * SELECT ltr.report_id, ltr.final_status, ltr.tested_on,
 *        ltr.detected_residue, ltr.mrl_limit, ltr.withdrawal_days_remaining,
 *        ltr.remarks, ltr.certificate_url,
 *        a.species, t.medicine, f.farm_name, u.display_name AS farmer_name,
 *        fr.farmer_id, l.lab_name, l.license_number, l.district, l.state,
 *        s.sample_type, s.collected_date
 * FROM lab_test_reports ltr
 * JOIN samples s ON ltr.sample_id = s.sample_id
 * JOIN sample_requests sr ON s.sample_request_id = sr.sample_request_id
 * JOIN treatment_records t ON sr.treatment_id = t.treatment_id
 * JOIN animals_or_batches a ON sr.entity_id = a.entity_id
 * JOIN farmers fr ON sr.farmer_id = fr.farmer_id
 * JOIN users u ON fr.user_id = u.user_id
 * JOIN farms f ON t.farm_id = f.farm_id
 * JOIN laboratories l ON ltr.lab_id = l.lab_id
 * ORDER BY ltr.tested_on DESC;
 * 
 * Response: Array of all lab reports with lab info
 */

/**
 * GET /api/labs/authority/reports-by-status/:status
 * 
 * Filter reports by status (safe, borderline, unsafe)
 * Valid status values: 'safe', 'borderline', 'unsafe'
 * 
 * Response: Array of reports matching the status
 */

/**
 * GET /api/labs/authority/unsafe-reports
 * 
 * Get all UNSAFE reports requiring immediate attention
 * 
 * Response: Array of unsafe reports with lab contact details
 */

// =====================================================================
// END-TO-END DATA FLOW
// =====================================================================
/**
 * 1. Vet treats animal → treatment_records table (status: completed)
 * 2. AMU calculates withdrawal → amu_records table (safe_date stored)
 * 3. System assigns nearest lab → sample_requests table (status: requested)
 * 4. Lab collects sample → samples table created
 *                        → sample_requests status = 'collected'
 * 5. Lab tests & uploads report → lab_test_reports table created
 *                               → sample_requests status = 'tested'
 * 6. Authority reviews → authority can access all reports globally
 */

// =====================================================================
// IMPLEMENTATION CHECKLIST
// =====================================================================
/**
 * ✅ 1. Dashboard Counts Endpoint
 *       - Pending Requests Query
 *       - Samples Collected Query
 *       - Under Testing Query
 *       - Completed Reports Query
 * 
 * ✅ 2. Pending Sample Requests
 *       - JOIN with animals_or_batches, farms, treatment_records
 *       - Filter by assigned_lab_id and status='requested'
 *       - Order by safe_date
 * 
 * ✅ 3. Sample Collection
 *       - Insert into samples table
 *       - Update sample_requests status to 'collected'
 *       - Notify farmer
 * 
 * ✅ 4. Lab Test Report Upload
 *       - Insert into lab_test_reports table
 *       - Update sample_requests status to 'tested'
 *       - Create alert for unsafe results
 * 
 * ✅ 5. All Reports (Lab View)
 *       - Complete JOIN query with all related tables
 *       - Show lab's own reports only
 * 
 * ✅ 6. Authority Lab Records
 *       - Global view of all lab reports
 *       - Filter by status
 *       - Unsafe reports alert
 */

// =====================================================================
// TESTING
// =====================================================================
/**
 * Run database tests:
 * node test_lab_database.js
 * 
 * Run API endpoint tests:
 * node test_lab_dashboard_complete.js
 * 
 * View all pending requests for lab 1:
 * SELECT * FROM sample_requests WHERE assigned_lab_id = 1 AND status = 'requested';
 * 
 * View all lab reports:
 * SELECT * FROM lab_test_reports;
 * 
 * View authority dashboard:
 * GET http://localhost:5000/api/labs/authority/all-lab-reports
 * (requires authority role)
 */

module.exports = {
  endpoints: {
    dashboard: 'GET /api/labs/stats',
    pendingRequests: 'GET /api/labs/pending-requests',
    collectSample: 'POST /api/labs/collect-sample',
    uploadReport: 'POST /api/labs/upload-report',
    allReports: 'GET /api/labs/all-reports',
    authorityAllReports: 'GET /api/labs/authority/all-lab-reports',
    authorityByStatus: 'GET /api/labs/authority/reports-by-status/:status',
    authorityUnsafe: 'GET /api/labs/authority/unsafe-reports'
  }
};
