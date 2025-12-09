# 🔬 LABORATORY MODULE - DATABASE FLOW IMPLEMENTATION COMPLETE ✅

## Overview

All 7 steps of the laboratory module database flow have been implemented. This guide documents what was implemented and how to use the system.

---

## ✅ IMPLEMENTATION SUMMARY

### Step 1: AMU Record → Sample Request Automatic Creation ✅

**Location:** `backend/models/AMU.js`

**What it does:**

- When an AMU record is created with a `safe_date`, the system automatically creates a sample request
- The system intelligently assigns the lab based on location priority:
  1. Same taluk (highest priority)
  2. Same district
  3. Same state
  4. Any available lab

**Code Added:**

```javascript
// Helper method: AMU.findAssignedLab(state, district, taluk)
// Creates sample_request automatically in AMU.create() method
```

**Result:**

- Sample request is created with status='requested'
- Farmer is notified about the lab assignment
- Lab is ready to receive samples on the safe_date

---

### Step 2: Lab Dashboard - Pending Requests ✅

**Endpoint:** `GET /api/labs/pending-requests`
**Authentication:** Laboratory role required

**What it does:**

- Fetches all sample requests assigned to this lab with status='requested'
- Returns details: species, farm name, safe date, medicine used
- Ordered by safe_date (earliest first)

**Query includes:**

- Sample request details
- Animal/batch species and tag
- Farm location and address
- Treatment medicine and duration

**Example Response:**

```json
[
  {
    "sample_request_id": 1,
    "treatment_id": 10,
    "entity_id": 5,
    "safe_date": "2025-01-15",
    "status": "requested",
    "species": "cattle",
    "tag_id": "TAG-001",
    "farm_name": "Green Valley Farm",
    "farm_address": "District: Belgaum",
    "treatment_medicine": "Amoxicillin"
  }
]
```

---

### Step 3: Sample Collection ✅

**Endpoint:** `POST /api/labs/collect-sample`
**Authentication:** Laboratory role required

**Request body:**

```json
{
  "sample_request_id": 1,
  "sample_type": "milk",
  "collected_date": "2025-01-15",
  "remarks": "Clear, well-preserved sample"
}
```

**What it does:**

1. Inserts record into `samples` table
2. Updates `sample_requests` status to 'collected'
3. Notifies farmer that sample was collected

**Database Changes:**

```sql
INSERT INTO samples (sample_request_id, sample_type, collected_date, collected_by_lab_id, remarks)
VALUES (?, ?, ?, ?, ?);

UPDATE sample_requests SET status='collected' WHERE sample_request_id = ?;
```

---

### Step 4: Report Submission ✅

**Endpoint:** `POST /api/labs/upload-report`
**Authentication:** Laboratory role required

**Request body:**

```json
{
  "sample_id": 1,
  "detected_residue": 0.05,
  "mrl_limit": 0.1,
  "withdrawal_days_remaining": 5,
  "final_status": "safe",
  "tested_on": "2025-01-20",
  "remarks": "Sample passed all tests",
  "certificate_url": "https://..."
}
```

**What it does:**

1. Inserts test report into `lab_test_reports`
2. Updates `sample_requests` status to 'tested'
3. If unsafe: Creates alert notification for authority
4. If safe: Notifies farmer with safe withdrawal date

**Database Changes:**

```sql
INSERT INTO lab_test_reports (sample_id, lab_id, detected_residue, mrl_limit, ...)
VALUES (...);

UPDATE sample_requests SET status='tested' WHERE sample_request_id = ?;
```

---

### Step 5: All Reports Screen ✅

**Endpoint:** `GET /api/labs/all-reports`
**Authentication:** Laboratory role required

**What it does:**

- Fetches all test reports submitted by this lab
- Includes full context: sample type, farm, entity details
- Ordered by tested_on date (newest first)

**Returns:**

```json
[
  {
    "report_id": 1,
    "detected_residue": 0.05,
    "mrl_limit": 0.1,
    "final_status": "safe",
    "tested_on": "2025-01-20",
    "farm_name": "Green Valley Farm",
    "species": "cattle",
    "sample_type": "milk"
  }
]
```

---

### Step 6: Lab Profile Load & Update ✅

**Endpoints:**

- `GET /api/labs/profile` - Fetch lab profile
- `PUT /api/labs/profile` - Update lab profile

**GET Response:**

```json
{
  "lab_id": 1,
  "user_id": 10,
  "lab_name": "Central Research Lab",
  "license_number": "LIC-2024-001",
  "phone": "9876543210",
  "email": "lab@example.com",
  "state": "Karnataka",
  "district": "Belgaum",
  "taluk": "Belgaum",
  "address": "123 Lab Street"
}
```

**PUT Request:**

```json
{
  "lab_name": "Updated Lab Name",
  "phone": "9876543210",
  "address": "Updated Address",
  "district": "New District",
  "state": "New State",
  "taluk": "New Taluk"
}
```

---

### Step 7: Notifications ✅

**Location:** `backend/utils/notificationScheduler.js`

**What it does:**
The notification scheduler runs automatically and handles three types of checks:

#### 7a. Safe Date Reached Notifications

- **Frequency:** Every 6 hours
- **Trigger:** When sample_request.safe_date <= TODAY
- **Action:** Sends alert to assigned lab: "Withdrawal period completed. X samples ready for collection"
- **Marks:** notification_sent_at timestamp

#### 7b. Unsafe Test Result Alerts

- **Frequency:** Every 2 hours
- **Trigger:** When lab_test_reports.final_status = 'unsafe'
- **Action:** Sends alert to ALL authority users with residue details
- **Marks:** notification_sent_at timestamp

#### 7c. Pending Collection Reminders

- **Frequency:** Daily
- **Trigger:** When sample request is 2+ days overdue (safe_date + 2 days < TODAY)
- **Action:** Sends reminder to lab: "⏰ REMINDER: Sample collection overdue by X days"
- **Marks:** reminder_sent_at timestamp

---

## 🚀 INITIALIZATION

The notification scheduler is automatically initialized when the server starts:

```javascript
// In server.js
const NotificationScheduler = require("./utils/notificationScheduler");
NotificationScheduler.initializeScheduler();
```

**Console Output on Start:**

```
🔔 Initializing Notification Scheduler...
   - Safe date checks: Every 6 hours
   - Unsafe result checks: Every 2 hours
   - Pending collection reminders: Daily
✅ Notification Scheduler initialized
```

---

## 📊 DATABASE SCHEMA REQUIREMENTS

### Required Tables

All of the following tables must exist:

- ✅ `sample_requests` - Core table for sample tracking
- ✅ `samples` - Physical sample collection records
- ✅ `lab_test_reports` - Test results from labs
- ✅ `laboratories` - Lab profile information
- ✅ `animals_or_batches` - Animals/batches being treated
- ✅ `farms` - Farm location details
- ✅ `treatment_records` - Treatment records
- ✅ `amu_records` - AMU calculations with safe_dates
- ✅ `users` - User accounts and roles
- ✅ `notification_history` - Notification logs
- ✅ `farmers` - Farmer details linked to users

### Required Columns to Add

Run the migration script:

```sql
ALTER TABLE sample_requests
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE sample_requests
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE lab_test_reports
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP NULL DEFAULT NULL;
```

---

## 🔄 COMPLETE WORKFLOW EXAMPLE

### Day 1: Farmer creates treatment

```
1. Farmer logs in → Creates treatment for cattle
2. Farmer logs in → Creates AMU record for treatment
3. System automatically:
   - Calculates safe_date (end_date + withdrawal_days)
   - Finds best lab based on location
   - Creates sample_request with status='requested'
   - Notifies farmer: "Lab assigned for sample collection"
```

### Day 2-7: Withdrawal period

```
- Treatment continues
- Notification scheduler runs every 6 hours
- When safe_date is reached:
  → Notification sent to assigned lab: "Samples ready for collection"
```

### Day 8: Lab collects sample

```
1. Lab logs in → Sees pending request in dashboard
2. Lab clicks "Collect Sample"
3. Fills in: sample_type, collected_date, remarks
4. System:
   - Creates samples record
   - Updates status to 'collected'
   - Notifies farmer
```

### Day 10: Lab submits report

```
1. Lab logs in → Sees untested samples
2. Lab fills in test results: residue level, MRL, status
3. System:
   - Creates lab_test_reports record
   - Updates status to 'tested'
   - If unsafe: Alerts authority users
   - If safe: Notifies farmer with safe date
```

### Ongoing: Authority reviews

```
1. Authority logs in → Sees all reports
2. Can view test results and status trends
3. Gets alerted if any unsafe residues detected
```

---

## 🛠️ API ENDPOINTS SUMMARY

### Laboratory Routes

| Method | Endpoint                     | Purpose                                   |
| ------ | ---------------------------- | ----------------------------------------- |
| GET    | `/api/labs/profile`          | Get lab profile                           |
| PUT    | `/api/labs/profile`          | Update lab profile                        |
| GET    | `/api/labs/pending-requests` | Get pending sample requests               |
| GET    | `/api/labs/sample-requests`  | Get all sample requests                   |
| GET    | `/api/labs/pending-samples`  | Get approved samples ready for collection |
| GET    | `/api/labs/untested-samples` | Get collected but untested samples        |
| GET    | `/api/labs/all-reports`      | Get all test reports submitted            |
| POST   | `/api/labs/collect-sample`   | Record sample collection                  |
| POST   | `/api/labs/upload-report`    | Submit test report                        |
| GET    | `/api/labs/stats`            | Get lab statistics                        |

### Authority Routes

| Method | Endpoint               | Purpose              |
| ------ | ---------------------- | -------------------- |
| GET    | `/api/lab-reports`     | View all lab reports |
| GET    | `/api/lab-reports/:id` | View single report   |

---

## 🧪 TESTING THE IMPLEMENTATION

### Manual Testing Steps

1. **Test Lab Assignment Logic:**

   - Create multiple labs in different locations
   - Create treatment with AMU
   - Verify sample_request is assigned to correct lab

2. **Test Sample Collection:**

   - Create pending sample request
   - Use collect-sample endpoint
   - Verify status changes to 'collected'

3. **Test Report Submission:**

   - Create sample and collect it
   - Submit test report
   - Verify status changes to 'tested'
   - Check notifications

4. **Test Notifications:**
   - Create sample request with safe_date = today - 1
   - Wait for scheduler to run (or call manually)
   - Check if notification was created

### Automated Testing

```bash
# Create test data
node backend/create_sample_request_for_treatment.js

# Verify lab assignment
SELECT * FROM sample_requests WHERE treatment_id = 1;

# Test notification scheduler (optional: call manually)
npm test -- utils/notificationScheduler.js
```

---

## 📝 TROUBLESHOOTING

### Issue: Sample requests not being created

**Solution:**

- Verify AMU record has safe_date
- Check if any labs exist in system
- Check server logs for errors in findAssignedLab()

### Issue: Notifications not sending

**Solution:**

- Verify notification_sent_at column exists
- Check if scheduler is initialized (check server logs)
- Verify user_id exists for lab and authority users
- Check notification_history table for logs

### Issue: Lab not found when assigning sample

**Solution:**

- Make sure lab profile is created
- Verify lab has state, district, taluk set
- Check that lab is assigned to correct location

---

## 🔐 SECURITY NOTES

1. **Sample Request Access:** Only assigned lab can access their sample requests
2. **Profile Updates:** Only lab user can update their own profile
3. **Report Submission:** Only lab user can submit reports for their lab
4. **Authority Access:** Only authority users can view all reports

---

## 📈 MONITORING

Check the following in production:

1. **Notification Scheduler Logs:**

   - Monitor console output for "Safe Date Notification Check"
   - Verify all three scheduler jobs are running

2. **Database Performance:**

   - Ensure indexes on sample_requests.safe_date
   - Monitor notification_history table size

3. **Sample Request Status Distribution:**

   ```sql
   SELECT status, COUNT(*)
   FROM sample_requests
   GROUP BY status;
   ```

4. **Lab Report Status:**
   ```sql
   SELECT final_status, COUNT(*)
   FROM lab_test_reports
   GROUP BY final_status;
   ```

---

## 🎯 CRITICAL NOTES

⚠️ **DO NOT HARDCODE LAB IDS**
The system automatically selects the best lab based on:

1. Same taluk
2. Same district
3. Same state
4. Any available lab

This ensures optimal resource utilization and avoids bottlenecks.

⚠️ **NOTIFICATIONS ARE AUTO-TRIGGERED**

- No manual notification sending needed
- Scheduler runs automatically on server start
- All notifications logged in notification_history table

⚠️ **STATUS FLOW IS STRICT**
Sample requests follow this status flow:

```
requested → (lab collects) → collected → (lab tests) → tested
                          ↓
                    (overdue notification)
```

---

## 📚 RELATED FILES

- Backend Models: `backend/models/AMU.js`, `backend/models/SampleRequest.js`, `backend/models/Laboratory.js`
- Backend Routes: `backend/routes/labRoutes.js`, `backend/routes/labReportRoutes.js`
- Scheduler: `backend/utils/notificationScheduler.js`
- Server: `backend/server.js`
- Schema: `backend/DATABASE_SCHEMA_UPDATES.sql`

---

## ✨ KEY FEATURES IMPLEMENTED

✅ Automatic sample request creation when AMU record is generated
✅ Intelligent lab assignment based on location priority
✅ Real-time sample collection tracking
✅ Lab test report submission and tracking
✅ Automatic notifications for safe dates, unsafe results, and overdue collections
✅ Complete lab profile management
✅ Authority oversight of all lab reports
✅ Farmer notifications about sample status
✅ Complete audit trail in notification_history

---

**Last Updated:** December 2024
**Status:** Production Ready ✅
