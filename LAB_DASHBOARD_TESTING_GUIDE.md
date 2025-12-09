# 🧪 LAB DASHBOARD - COMPREHENSIVE TESTING GUIDE

Welcome! This guide will help you test all 6 tabs of the Laboratory Dashboard.

## 📋 Quick Start

### Prerequisites

- ✅ Backend running on `http://localhost:5000`
- ✅ Frontend running on `http://localhost:3000`
- ✅ Lab user authenticated and logged in
- ✅ Sample requests created in the database

### Test Environment Setup

1. **Start Backend**

   ```bash
   cd backend
   npm start
   ```

   Expected output: `🚀 Server running on port 5000`

2. **Start Frontend**

   ```bash
   cd frontend
   npm start
   ```

   Expected output: `On Your Network: http://...`

3. **Login as Laboratory User**
   - Navigate to `http://localhost:3000`
   - Login with laboratory credentials
   - You should see "🧪 Laboratory Dashboard"

---

## 🎯 Dashboard Overview

The Laboratory Dashboard displays 6 main sections:

```
┌─────────────────────────────────────────────────────────────┐
│ 🧪 Laboratory Dashboard                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⏳ Pending Requests  🧫 Samples Collected  🔬 Under Testing│
│  ✅ Reports Completed  👤 Lab Profile  🔔 Notifications    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 TAB 1: PENDING REQUESTS

### Purpose

View sample requests assigned to your laboratory that haven't been collected yet.

### Expected Data

- **Status:** `requested` or `approved`
- **Fields:** sample_request_id, entity_id, species, farm_name, safe_date
- **Actions:** "Collect Sample" button

### API Endpoint

```
GET /api/labs/pending-requests
Authorization: Bearer <token>
```

### Test Steps

1. Open Laboratory Dashboard
2. Navigate to "Pending Requests" tab (or click ⏳ stat card)
3. Verify you see a table with pending samples
4. Check that each row has:
   - ✅ Sample Request ID
   - ✅ Entity ID (tag_id or batch_name)
   - ✅ Species (cattle, poultry, etc.)
   - ✅ Farm Name
   - ✅ Safe Date
   - ✅ "Collect Sample" button

### Sample Response

```json
[
  {
    "sample_request_id": 1,
    "treatment_id": 5,
    "farmer_id": 2,
    "entity_id": 10,
    "safe_date": "2025-01-10",
    "status": "requested",
    "species": "cattle",
    "tag_id": "TAG001",
    "farm_name": "Green Valley Farm",
    "farm_address": "123 Farm Road"
  }
]
```

### ✅ Success Criteria

- [ ] Page loads without errors
- [ ] Data is displayed in a table format
- [ ] Each request shows correct safe_date
- [ ] "Collect Sample" button is clickable
- [ ] Clicking button navigates to collection form

### ❌ Troubleshooting

| Issue         | Solution                                                |
| ------------- | ------------------------------------------------------- |
| No data shown | Check database for sample_requests with assigned_lab_id |
| 404 Error     | Verify endpoint is `/api/labs/` not `/api/lab/`         |
| Empty results | Create sample requests via AMU creation                 |

---

## 🧫 TAB 2: SAMPLES COLLECTED

### Purpose

View samples that have been collected and are ready for laboratory testing.

### Expected Data

- **Status:** `collected`
- **Fields:** sample_id, sample_type (milk/meat/egg), collected_date
- **Actions:** "Upload Report" button

### API Endpoint

```
GET /api/labs/untested-samples
Authorization: Bearer <token>
```

### Test Steps

1. Open Laboratory Dashboard
2. Navigate to "Samples Collected" tab (or click 🧫 stat card)
3. Verify you see samples that have been collected
4. Check that each row has:
   - ✅ Sample ID
   - ✅ Sample Type (milk/meat/egg/etc.)
   - ✅ Collected Date
   - ✅ "Upload Report" button

### Sample Response

```json
[
  {
    "sample_id": 1,
    "sample_type": "milk",
    "collected_date": "2025-01-10",
    "entity_id": 10
  }
]
```

### ✅ Success Criteria

- [ ] Page loads without errors
- [ ] Shows only collected samples (not yet tested)
- [ ] Each sample shows collection date
- [ ] "Upload Report" button is available
- [ ] Clicking button opens report submission form

### ❌ Troubleshooting

| Issue             | Solution                                            |
| ----------------- | --------------------------------------------------- |
| No data shown     | Collect a sample first via "Pending Requests" tab   |
| 404 Error         | Verify endpoint is `/api/labs/untested-samples`     |
| Old samples shown | Check that status in DB is 'collected' not 'tested' |

---

## 🔬 TAB 3: UNDER TESTING (Stats Card)

### Purpose

Show count of samples currently being tested (collected but not yet reported).

### Expected Value

Number should equal: (total collected) - (total tested)

### API Endpoint

```
GET /api/labs/stats
Authorization: Bearer <token>
Response: { pending, collected, tested, completed }
```

### Test Steps

1. Note the "🔬 Under Testing" count on dashboard
2. Check "🧫 Samples Collected" count
3. Check "✅ Reports Completed" count
4. Verify: `Under Testing = Samples Collected - Reports Completed`

### Sample Response

```json
{
  "pending": 5,
  "collected": 10,
  "tested": 3,
  "completed": 3
}
```

### ✅ Success Criteria

- [ ] Stats load without errors
- [ ] Count matches formula above
- [ ] Updates when samples are collected
- [ ] Updates when reports are submitted

### ❌ Troubleshooting

| Issue       | Solution                                   |
| ----------- | ------------------------------------------ |
| Count is 0  | Create sample requests and collect samples |
| Wrong count | Check database queries in /stats endpoint  |

---

## ✅ TAB 4: REPORTS COMPLETED

### Purpose

View all submitted laboratory test reports with results.

### Expected Data

- **Fields:** report_id, final_status (safe/unsafe), detected_residue, mrl_limit, tested_date
- **Filtering:** By status, date range
- **Actions:** Download certificate (if available)

### API Endpoint

```
GET /api/labs/all-reports
Authorization: Bearer <token>
```

### Test Steps

1. Open Laboratory Dashboard
2. Navigate to "All Reports" tab (or click ✅ stat card)
3. Verify you see submitted reports
4. Check that each report shows:
   - ✅ Report ID
   - ✅ Final Status (🟢 Safe / 🔴 Unsafe / 🟡 Borderline)
   - ✅ Detected Residue amount
   - ✅ MRL Limit for comparison
   - ✅ Tested Date
   - ✅ Remarks/Notes (if any)

### Sample Response

```json
[
  {
    "report_id": 1,
    "sample_id": 1,
    "final_status": "safe",
    "detected_residue": 0.05,
    "mrl_limit": 0.1,
    "withdrawal_days_remaining": 0,
    "tested_on": "2025-01-10",
    "remarks": "All residues within acceptable limits",
    "certificate_url": "https://..."
  }
]
```

### ✅ Success Criteria

- [ ] Page loads without errors
- [ ] Shows all submitted reports
- [ ] Status color-coded (green for safe, red for unsafe)
- [ ] Residue values clearly displayed
- [ ] Timestamp shows when report was submitted
- [ ] Filter options work (by status, date)

### ❌ Troubleshooting

| Issue            | Solution                                               |
| ---------------- | ------------------------------------------------------ |
| No reports shown | Submit a test report via "Upload Report"               |
| 404 Error        | Verify endpoint is `/api/labs/all-reports`             |
| Empty page       | Check sample_requests and samples are linked correctly |

---

## 👤 TAB 5: LAB PROFILE

### Purpose

View and edit laboratory profile information.

### Expected Data

- **Editable Fields:** lab_name, license_number, phone, email, state, district, taluk, address
- **Read-only:** lab_id, created_date

### API Endpoints

```
GET /api/labs/profile
PUT /api/labs/profile
Authorization: Bearer <token>
```

### Test Steps

1. Open Laboratory Dashboard
2. Navigate to "Lab Profile" tab (or click 🏥 in main menu)
3. View current profile information
4. Test editing:
   - [ ] Click on phone field
   - [ ] Change value
   - [ ] Click Save
   - [ ] Verify message "Profile updated"
   - [ ] Refresh page and confirm changes persisted
5. Repeat for other fields (address, district, taluk, etc.)

### Test Data

```json
{
  "lab_name": "Central Testing Laboratory",
  "license_number": "LAB-2024-001",
  "phone": "+91-9876543210",
  "email": "lab@example.com",
  "state": "Karnataka",
  "district": "Belgaum",
  "taluk": "Belgaum",
  "address": "123 Lab Road, Science Park"
}
```

### ✅ Success Criteria

- [ ] Profile form loads without errors
- [ ] All fields are editable
- [ ] Changes save successfully
- [ ] Success message appears after save
- [ ] Changes persist after page refresh
- [ ] Location fields (state/district/taluk) have dropdown options

### ❌ Troubleshooting

| Issue              | Solution                               |
| ------------------ | -------------------------------------- |
| Can't edit fields  | Check user role is 'laboratory'        |
| Changes don't save | Verify backend PUT endpoint is working |
| 404 Error          | Check endpoint is `/api/labs/profile`  |

---

## 🔔 TAB 6: NOTIFICATIONS

### Purpose

View alerts and important messages related to laboratory operations.

### Expected Notifications

- Safe date reached notifications (when sample collection is due)
- Unsafe residue alerts (when results exceed limits)
- Collection reminders (when samples overdue)
- New sample requests assigned

### API Endpoint

```
GET /api/notifications
Authorization: Bearer <token>
```

### Test Steps

1. Open Laboratory Dashboard
2. Navigate to "Notifications" tab (or click 🔔 in main menu)
3. Verify you see messages with:
   - ✅ Type (alert/info/warning/success)
   - ✅ Message content
   - ✅ Timestamp
   - ✅ Mark as read option

### Sample Notifications

```json
[
  {
    "notification_id": 1,
    "type": "alert",
    "message": "Withdrawal period completed. Sample collection required.",
    "created_at": "2025-01-10T08:00:00Z",
    "read": false
  },
  {
    "notification_id": 2,
    "type": "warning",
    "message": "⚠️ UNSAFE: Residue 0.15 exceeds MRL 0.10",
    "created_at": "2025-01-09T15:30:00Z",
    "read": false
  }
]
```

### ✅ Success Criteria

- [ ] Notification page loads without errors
- [ ] Notifications display with timestamps
- [ ] Can mark notifications as read
- [ ] Critical alerts are color-coded
- [ ] New notifications appear in real-time

### ❌ Troubleshooting

| Issue                   | Solution                                      |
| ----------------------- | --------------------------------------------- |
| No notifications        | Create sample requests and wait for safe date |
| 404 Error               | Check endpoint is `/api/notifications`        |
| Old notifications shown | Check notification_history table for filters  |

---

## 🚀 FULL WORKFLOW TEST

Test the complete workflow from start to finish:

### Step 1: Create Treatment & AMU

- ✅ Farmer creates treatment record
- ✅ Farmer adds AMU with safe_date
- ✅ AMU.create() triggers sample_request creation
- ✅ Lab is auto-assigned based on location

### Step 2: Check Dashboard Stats

```
Expected: pending = 1, collected = 0, tested = 0
```

### Step 3: Collect Sample

- ✅ Lab views "Pending Requests"
- ✅ Clicks "Collect Sample" button
- ✅ Submits collection form with sample_type, collected_date
- ✅ Database inserts sample record

### Step 4: Check Updated Stats

```
Expected: pending = 0, collected = 1, tested = 0, Under Testing = 1
```

### Step 5: Submit Test Report

- ✅ Lab views "Samples Collected"
- ✅ Clicks "Upload Report" button
- ✅ Fills test results (residue, MRL, status)
- ✅ Submits report

### Step 6: Check Final Stats

```
Expected: collected = 1, tested = 1, completed = 1, Under Testing = 0
```

### Step 7: Verify Reports

- ✅ Lab views "All Reports"
- ✅ Reports shows submitted test results
- ✅ Status is correctly marked (safe/unsafe)

---

## 🛠️ API ENDPOINT SUMMARY

| Tab           | Endpoint                     | Method  | Description                        |
| ------------- | ---------------------------- | ------- | ---------------------------------- |
| Stats         | `/api/labs/stats`            | GET     | Get dashboard counters             |
| Pending       | `/api/labs/pending-requests` | GET     | Get pending sample requests        |
| Collected     | `/api/labs/untested-samples` | GET     | Get collected but untested samples |
| Reports       | `/api/labs/all-reports`      | GET     | Get all submitted reports          |
| Profile       | `/api/labs/profile`          | GET/PUT | View/edit lab profile              |
| Notifications | `/api/notifications`         | GET     | Get user notifications             |

---

## 🔧 TESTING WITH CURL

### Get Stats

```bash
curl -X GET http://localhost:5000/api/labs/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Pending Requests

```bash
curl -X GET http://localhost:5000/api/labs/pending-requests \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Collect Sample

```bash
curl -X POST http://localhost:5000/api/labs/collect-sample \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sample_request_id": 1,
    "sample_type": "milk",
    "collected_date": "2025-01-10",
    "remarks": "Sample collected from dairy"
  }'
```

### Upload Report

```bash
curl -X POST http://localhost:5000/api/labs/upload-report \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sample_id": 1,
    "detected_residue": 0.05,
    "mrl_limit": 0.1,
    "final_status": "safe",
    "tested_on": "2025-01-10",
    "remarks": "All tests passed"
  }'
```

---

## ✅ FINAL CHECKLIST

- [ ] All 6 tabs load without errors
- [ ] Stats display correct counts
- [ ] Pending requests show assigned samples
- [ ] Sample collection form works
- [ ] Test report submission works
- [ ] Lab profile can be edited
- [ ] Notifications appear for key events
- [ ] Full workflow completes successfully
- [ ] Data persists after refresh
- [ ] All API endpoints return correct data

---

## 📞 SUPPORT

If you encounter issues, check:

1. **Backend running:** `curl http://localhost:5000/health`
2. **Token valid:** Check localStorage for token
3. **Lab exists:** Check laboratories table
4. **Lab assigned:** Check sample_requests table
5. **Database connected:** Check database logs

For detailed logs, enable debug mode:

```bash
DEBUG=* node test_lab_dashboard.js
```

---

**Last Updated:** December 9, 2025
**Status:** ✅ Complete - Ready for Testing
