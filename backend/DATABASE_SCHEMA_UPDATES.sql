-- ========================================
-- DATABASE SCHEMA UPDATES FOR LABORATORY MODULE
-- ========================================
-- This file documents the required database schema changes to support the complete
-- laboratory workflow with sample requests, collection, and testing.

-- ========================================
-- 1. SAMPLE_REQUESTS TABLE (Required columns)
-- ========================================
-- The sample_requests table needs these columns (if not already present):
-- - notification_sent_at: TIMESTAMP NULL DEFAULT NULL
--   (Tracks when safe-date-reached notification was sent to lab)

ALTER TABLE sample_requests 
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP NULL DEFAULT NULL AFTER status;

ALTER TABLE sample_requests 
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP NULL DEFAULT NULL AFTER notification_sent_at;

-- ========================================
-- 2. LAB_TEST_REPORTS TABLE (Required columns)
-- ========================================
-- The lab_test_reports table needs this column (if not already present):
-- - notification_sent_at: TIMESTAMP NULL DEFAULT NULL
--   (Tracks when unsafe result notification was sent to authority)

ALTER TABLE lab_test_reports 
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at;

-- ========================================
-- 3. VERIFY CURRENT SCHEMA
-- ========================================
-- Run these queries to verify the schema is correct:

-- Check sample_requests columns:
-- DESCRIBE sample_requests;

-- Check lab_test_reports columns:
-- DESCRIBE lab_test_reports;

-- ========================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ========================================
-- Test data to verify the laboratory workflow works end-to-end:

-- 1. Verify a lab exists in the system:
-- SELECT * FROM laboratories LIMIT 1;

-- 2. Create a test farm with correct location:
-- INSERT INTO farms (farmer_id, farm_name, address, state, district, taluk, total_area_hectares)
-- VALUES (1, 'Test Farm', '123 Test Road', 'Karnataka', 'Belgaum', 'Belgaum', 5.0);

-- 3. Create test animal/batch:
-- INSERT INTO animals_or_batches (farm_id, entity_type, species, tag_id, breed)
-- VALUES (1, 'animal', 'cattle', 'TAG001', 'Jersey');

-- 4. Create test treatment:
-- INSERT INTO treatment_records (entity_id, user_id, treatment_medicine, dosage, duration_days, start_date, end_date)
-- VALUES (1, 1, 'Amoxicillin', '500mg', 5, '2025-01-01', '2025-01-05');

-- 5. Create AMU record (which will auto-create sample_request):
-- INSERT INTO amu_records (treatment_id, entity_id, farm_id, user_id, species, medicine, safe_date, category_type)
-- VALUES (1, 1, 1, 1, 'cattle', 'Amoxicillin', '2025-01-10', 'antibiotic');

-- 6. Verify sample_request was created:
-- SELECT * FROM sample_requests WHERE treatment_id = 1;

-- 7. Simulate sample collection:
-- INSERT INTO samples (sample_request_id, sample_type, collected_date, collected_by_lab_id, remarks)
-- VALUES (1, 'milk', CURDATE(), 1, 'Test sample');

-- 8. Update sample_request status:
-- UPDATE sample_requests SET status = 'collected' WHERE sample_request_id = 1;

-- 9. Submit lab report:
-- INSERT INTO lab_test_reports (sample_id, lab_id, detected_residue, mrl_limit, final_status, tested_on, remarks)
-- VALUES (1, 1, 0.05, 0.10, 'safe', CURDATE(), 'Test passed');

-- 10. Update sample_request status to tested:
-- UPDATE sample_requests SET status = 'tested' WHERE sample_request_id = 1;

-- ========================================
-- NOTES
-- ========================================
-- 1. The notification scheduler runs periodically:
--    - Safe date checks: Every 6 hours
--    - Unsafe result checks: Every 2 hours  
--    - Pending collection reminders: Daily
--
-- 2. The scheduler is initialized when the server starts
--
-- 3. Notifications are sent to:
--    - Labs: When withdrawal period is complete (safe_date reached)
--    - Authority: When test results are unsafe
--    - Labs: Reminder when sample collection is 2+ days overdue
--
-- 4. Make sure the following tables exist and have proper relationships:
--    - sample_requests
--    - samples
--    - lab_test_reports
--    - laboratories
--    - animals_or_batches
--    - farms
--    - treatment_records
--    - amu_records
--    - users
--    - notification_history
--    - farmers
