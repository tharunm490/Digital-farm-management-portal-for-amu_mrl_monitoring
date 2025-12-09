# 🧪 LAB DASHBOARD TESTING - COMPLETE COMMANDS

## 1️⃣ Verify Backend is Running

```bash
# Test health endpoint (no auth required)
curl http://localhost:5000/health

# Expected: {"status":"ok"}
```

## 2️⃣ Verify All Endpoints are Registered

```bash
# Run endpoint verification script
node verify_lab_endpoints.js

# Expected: ✅ ALL ENDPOINTS ARE REGISTERED! (100% coverage)
```

## 3️⃣ Test Endpoints with Valid Token

First, get a valid token:

1. Login to application
2. Open browser DevTools (F12)
3. Go to Console or Application → LocalStorage
4. Copy the "token" value

Then run tests:

```bash
# Replace TOKEN with actual value
node test_lab_dashboard.js "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 4️⃣ Manual Testing with CURL

### Get Stats (requires lab role)

```bash
curl -X GET http://localhost:5000/api/labs/stats \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Response:
# {
#   "pending": 0,
#   "collected": 0,
#   "tested": 0,
#   "completed": 0
# }
```

### Get Pending Requests

```bash
curl -X GET http://localhost:5000/api/labs/pending-requests \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response: Array of pending sample requests
```

### Get Untested Samples

```bash
curl -X GET http://localhost:5000/api/labs/untested-samples \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response: Array of collected samples
```

### Get All Reports

```bash
curl -X GET http://localhost:5000/api/labs/all-reports \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response: Array of test reports
```

### Get Lab Profile

```bash
curl -X GET http://localhost:5000/api/labs/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response: Lab profile object
```

### Collect Sample (POST)

```bash
curl -X POST http://localhost:5000/api/labs/collect-sample \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sample_request_id": 1,
    "sample_type": "milk",
    "collected_date": "2025-01-10",
    "remarks": "Clear sample collected"
  }'

# Response: { "message": "Sample collected", "sample_id": 1 }
```

### Submit Test Report (POST)

```bash
curl -X POST http://localhost:5000/api/labs/upload-report \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sample_id": 1,
    "detected_residue": 0.05,
    "mrl_limit": 0.1,
    "withdrawal_days_remaining": 0,
    "final_status": "safe",
    "tested_on": "2025-01-10",
    "remarks": "All residues within acceptable limits"
  }'

# Response: { "message": "Report uploaded", "report_id": 1 }
```

### Update Lab Profile (PUT)

```bash
curl -X PUT http://localhost:5000/api/labs/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lab_name": "Central Lab",
    "phone": "+91-9876543210",
    "address": "123 Lab Road",
    "state": "Karnataka",
    "district": "Belgaum",
    "taluk": "Belgaum"
  }'

# Response: { "message": "Profile updated", "lab": {...} }
```

## 5️⃣ Frontend UI Testing

### Navigate to Each Tab

```
Tab 1: http://localhost:3000/lab/dashboard → Stats cards
Tab 2: http://localhost:3000/lab/pending-requests → Pending table
Tab 3: http://localhost:3000/lab/sample-collection → Collection form
Tab 4: http://localhost:3000/lab/upload-report → Report form
Tab 5: http://localhost:3000/lab/reports → Reports list
Tab 6: http://localhost:3000/lab/profile → Profile edit
Notifications: http://localhost:3000/notifications
```

### Test Each Tab

```javascript
// Tab 1: Dashboard Stats
// Expected: 4 stat cards with numbers
// Action: Click each card to navigate

// Tab 2: Pending Requests
// Expected: Table with pending samples
// Action: Click "Collect Sample" button

// Tab 3: Sample Collection
// Expected: Form for sample details
// Action: Select sample, fill form, submit

// Tab 4: Upload Report
// Expected: Form for test results
// Action: Fill results, click submit

// Tab 5: All Reports
// Expected: Table of submitted reports
// Action: Filter or view details

// Tab 6: Lab Profile
// Expected: Profile form with current data
// Action: Edit fields, click save

// Notifications
// Expected: List of alerts
// Action: Mark as read or dismiss
```

## 6️⃣ Test with Postman

### Create Postman Collection

1. Open Postman
2. Create new Collection: "Lab Dashboard"
3. Add requests:

**Request 1: Get Stats**

```
Method: GET
URL: http://localhost:5000/api/labs/stats
Headers:
  Authorization: Bearer {{token}}
  Content-Type: application/json
```

**Request 2: Get Pending Requests**

```
Method: GET
URL: http://localhost:5000/api/labs/pending-requests
Headers:
  Authorization: Bearer {{token}}
```

**Request 3: Collect Sample**

```
Method: POST
URL: http://localhost:5000/api/labs/collect-sample
Headers:
  Authorization: Bearer {{token}}
  Content-Type: application/json
Body:
{
  "sample_request_id": 1,
  "sample_type": "milk",
  "collected_date": "2025-01-10"
}
```

**Request 4: Upload Report**

```
Method: POST
URL: http://localhost:5000/api/labs/upload-report
Headers:
  Authorization: Bearer {{token}}
  Content-Type: application/json
Body:
{
  "sample_id": 1,
  "detected_residue": 0.05,
  "mrl_limit": 0.1,
  "final_status": "safe",
  "tested_on": "2025-01-10"
}
```

## 7️⃣ Complete Workflow Test

### Step 1: Create Test Data (as Farmer)

```
1. Login as farmer
2. Create farm with location
3. Create animal/batch
4. Create treatment
5. Create AMU record
   → Auto-creates sample_request
```

### Step 2: Check Notifications

```
1. Check notification_history table
2. Should see sample request creation notification
3. Should see safe date reached notification (when time comes)
```

### Step 3: Collect Sample (as Lab)

```
1. Login as lab user
2. View pending requests
3. Click collect sample
4. Submit collection form
```

### Step 4: Submit Report (as Lab)

```
1. View collected samples
2. Click upload report
3. Enter test results
4. Submit report
```

### Step 5: Verify Results

```
1. View all reports tab
2. Check final_status is marked
3. View notifications for results
4. Check farmer received notification
```

## 8️⃣ Debugging Commands

### Check Database Connection

```sql
-- In MySQL/MariaDB console
SHOW DATABASES;
USE your_db_name;
SHOW TABLES;
SELECT COUNT(*) FROM sample_requests;
SELECT COUNT(*) FROM samples;
SELECT COUNT(*) FROM lab_test_reports;
```

### Check Server Logs

```bash
# Terminal 1: Watch backend logs
tail -f backend.log | grep -E "STEP|Sample request|error"

# Terminal 2: Watch database logs (if available)
tail -f mysql.log | grep -E "sample_requests|samples|lab_test"
```

### Enable Debug Mode

```bash
# Run with debug logging
DEBUG=* node test_lab_dashboard.js "token"
DEBUG=* npm start  # in backend
```

### Check Browser Network Requests

```
1. Open DevTools (F12)
2. Go to Network tab
3. Interact with lab dashboard
4. Check each API call:
   - Status should be 200 for successful requests
   - Response should have valid JSON
   - Headers should have Authorization token
```

---

## 9️⃣ Expected Results Summary

### Endpoint Verification

```
✅ GET /api/labs/stats              → 401 (endpoint exists)
✅ GET /api/labs/pending-requests   → 401 (endpoint exists)
✅ GET /api/labs/untested-samples   → 401 (endpoint exists)
✅ GET /api/labs/all-reports        → 401 (endpoint exists)
✅ GET /api/labs/profile            → 401 (endpoint exists)
✅ GET /api/notifications           → 401 (endpoint exists)
✅ POST /api/labs/collect-sample    → 401 (endpoint exists)
✅ POST /api/labs/upload-report     → 401 (endpoint exists)
✅ PUT /api/labs/profile            → 401 (endpoint exists)

Total: 12/12 endpoints registered (100% ✅)
```

### Frontend UI Testing

```
✅ Dashboard loads without errors
✅ All 6 tabs are accessible
✅ Forms validate input
✅ API calls use correct endpoints
✅ Success messages shown
✅ Errors displayed properly
✅ Profile changes save
✅ Responsive on mobile
```

### Workflow Testing

```
✅ Sample request created for AMU
✅ Lab receives notification
✅ Lab can collect sample
✅ Lab can submit report
✅ Farmer receives notification
✅ Authority can view reports
✅ Data persists in database
```

---

## 🎯 When Everything Works

You should see:

- ✅ Dashboard with stat numbers updating
- ✅ Pending requests list when samples assigned
- ✅ Sample collection form works
- ✅ Report submission form works
- ✅ Reports appear in completed list
- ✅ Profile can be edited and saved
- ✅ Notifications appear for events
- ✅ Complete workflow executes successfully

**Status:** 🟢 READY FOR TESTING

---

Last updated: December 9, 2025
