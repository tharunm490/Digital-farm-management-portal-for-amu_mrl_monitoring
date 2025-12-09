# 🚀 LABORATORY MODULE - QUICK START GUIDE

## ✨ What's Implemented

The complete end-to-end laboratory workflow is **fully integrated and ready to test**:

### ✅ 12 API Endpoints

- Lab registration & profile management
- Dashboard statistics
- Sample request viewing
- Sample collection
- Test report submission
- Report viewing
- Auto-lab assignment

### ✅ 7 Frontend Components

- Lab dashboard with stats
- Sample requests viewer
- Sample collection form
- Test report entry form
- All reports viewer
- Incoming treatment cases
- Lab profile editor

### ✅ Auto-Workflow

- Treatments automatically create sample requests
- Location-based lab assignment (taluk → district → state → any)
- Notifications sent to labs, farmers, and authority

### ✅ Complete Navigation Menu

```
🔬 Laboratory Menu
├── Dashboard
├── Incoming Treatment Cases
├── Sample Requests
├── Sample Collection
├── Test Report Entry
├── All Reports
└── Profile
```

---

## 🎯 COMPLETE WORKFLOW

### 1️⃣ Lab Registration (First Time)

```
User → Google Signup with "Laboratory" role
   ↓
Auto-creates lab user entry
   ↓
Redirects to /lab/profile
   ↓
Lab fills form and saves details
   ↓
Access to lab dashboard
```

### 2️⃣ Automatic Sample Request Creation

```
Veterinarian creates Treatment
   ↓
System calculates AMU + Withdrawal Days
   ↓
Auto-creates sample_request entry
   ↓
Finds nearest lab:
  ├─ Same taluk (priority 1)
  ├─ Same district (priority 2)
  ├─ Same state (priority 3)
  └─ Any lab (priority 4)
   ↓
Assigns to that lab
   ↓
Lab gets notification
```

### 3️⃣ Sample Collection

```
Lab views "Sample Requests" (pending)
   ↓
Clicks "Collect Sample"
   ↓
Fills form:
  ├─ Sample type
  ├─ Collection date
  └─ Remarks
   ↓
Submits collection
   ↓
sample_requests.status = 'collected'
   ↓
Dashboard counters update
```

### 4️⃣ Test Report Submission

```
Lab views "Under Testing" (collected samples)
   ↓
Clicks sample to test
   ↓
Fills test results:
  ├─ Detected residue
  ├─ MRL limit
  ├─ Withdrawal days remaining
  ├─ Final status (safe/borderline/unsafe)
  └─ Certificate/remarks
   ↓
Submits report
   ↓
sample_requests.status = 'tested'
   ↓
sample_requests.status = 'completed'
   ↓
Notifications sent based on result
```

### 5️⃣ Authority View

```
Authority dashboard → "Lab Reports"
   ↓
See all reports:
  ├─ Treatment details (medicine, dosage)
  ├─ Farm information
  ├─ Lab details
  ├─ Actual vs Predicted withdrawal
  └─ Download certificate
   ↓
Can track compliance
```

---

## 🧪 TESTING INSTRUCTIONS

### Test 1: Lab Registration

```
1. Go to Login page
2. Click "Sign up with Google"
3. Select "Laboratory" as role
4. Complete registration
5. Fill lab profile form
6. Save profile
✓ Should show dashboard with 0,0,0,0 stats
```

### Test 2: Auto-Sample Request

```
1. Create treatment as farmer/vet
2. System calculates AMU
3. Check database:
   SELECT * FROM sample_requests WHERE status='requested';
✓ Should show entry with assigned_lab_id
```

### Test 3: Sample Collection

```
1. Login as lab user
2. Go to "Sample Requests"
3. Click "Collect Sample"
4. Fill form and submit
✓ Status updates to 'collected'
✓ Dashboard counters change
```

### Test 4: Test Report

```
1. Go to "Test Report Entry"
2. Select collected sample
3. Fill test results
4. Submit report
✓ Status updates to 'tested'
✓ Report appears in "All Reports"
```

### Test 5: Authority View

```
1. Login as authority
2. Go to Authority Dashboard
3. Check "Lab Reports" section
✓ Should see all reports with details
✓ Can download certificate
```

---

## 📊 DATABASE QUERIES

### Check Sample Requests

```sql
SELECT * FROM sample_requests
WHERE status='requested';
```

### Check Collected Samples

```sql
SELECT * FROM samples
JOIN sample_requests ON samples.sample_request_id = sample_requests.sample_request_id
WHERE sample_requests.assigned_lab_id = 1;
```

### Check Test Results

```sql
SELECT ltr.*, s.sample_type, sr.entity_id
FROM lab_test_reports ltr
JOIN samples s ON ltr.sample_id = s.sample_id
JOIN sample_requests sr ON s.sample_request_id = sr.sample_request_id
WHERE ltr.lab_id = 1;
```

### Check Lab Statistics

```sql
SELECT
  (SELECT COUNT(*) FROM sample_requests WHERE assigned_lab_id=1 AND status='requested') as pending,
  (SELECT COUNT(*) FROM samples WHERE collected_by_lab_id=1) as collected,
  (SELECT COUNT(*) FROM lab_test_reports WHERE lab_id=1) as tested;
```

---

## 🔑 KEY TABLES

| Table              | Purpose               | Key Columns                                              |
| ------------------ | --------------------- | -------------------------------------------------------- |
| `laboratories`     | Lab registration      | lab_id, user_id, lab_name, location                      |
| `sample_requests`  | Treatment→Lab mapping | sample_request_id, treatment_id, assigned_lab_id, status |
| `samples`          | Collected samples     | sample_id, sample_request_id, collected_date             |
| `lab_test_reports` | Test results          | report_id, sample_id, detected_residue, final_status     |

---

## 🔌 API ENDPOINTS

### Lab Dashboard

- `GET /api/labs/stats` → {pending, collected, tested, completed}

### Manage Requests

- `GET /api/labs/pending-requests` → Samples awaiting collection
- `GET /api/labs/sample-requests` → All requests assigned to lab
- `GET /api/labs/incoming-cases` → Treatments available for assignment

### Sample Operations

- `GET /api/labs/untested-samples` → Collected, not yet tested
- `POST /api/labs/collect-sample` → Record collection
- `POST /api/labs/upload-report` → Submit test results

### Lab Management

- `GET /api/labs/profile` → Lab details
- `PUT /api/labs/profile` → Update lab details
- `POST /api/labs/register` → Register lab (first time)

### View Reports

- `GET /api/labs/all-reports` → All submitted reports

---

## 💡 TROUBLESHOOTING

### Lab not appearing in dashboard

```
Check:
1. User role = 'laboratory' in users table
2. Lab entry exists in laboratories table
3. Token is valid (no expiration)
```

### Sample requests not auto-creating

```
Check:
1. AMU record has safe_date calculated
2. Farm has location (taluk, district, state)
3. At least one lab exists in database
4. Check backend logs for errors
```

### Samples not showing for collection

```
Check:
1. sample_requests.status = 'requested'
2. sample_requests.assigned_lab_id = current lab_id
3. safe_date has been reached (today or earlier)
```

### Reports not appearing for authority

```
Check:
1. lab_test_reports entry created
2. User has 'authority' role
3. Report lab_id matches actual lab
```

---

## 📝 NOTES

- **Auto-assignment**: Happens automatically when AMU is created
- **Location-based**: Lab selection uses farm location (taluk > district > state > any)
- **Status flow**: requested → collected → tested → completed
- **Final status binding**: Lab result overrides AMU prediction
- **Notifications**: Sent to all stakeholders at each step

---

## ✅ CHECKLIST BEFORE TESTING

- [ ] Backend running (`npm start` in backend)
- [ ] Frontend running (`npm start` in frontend)
- [ ] Database connected
- [ ] At least one lab registered
- [ ] Test treatment/AMU data exists
- [ ] Lab user can login
- [ ] All navigation links working
- [ ] API endpoints returning data (not 500 errors)

---

**Status**: 🟢 **READY FOR TESTING**

All components integrated. No additional setup needed.
Start testing the complete workflow now!
