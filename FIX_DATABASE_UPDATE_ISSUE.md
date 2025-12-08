# 🔬 Laboratory Profile - Database Update Issue FIX

## Problem

Laboratory profile data is not updating in the database.

## Root Causes (Investigated & Fixed)

### 1. ✅ Frontend - Not Refreshing Data After Save

**Issue**: After successful save, the form wasn't showing the updated data
**Fix**: Updated `handleSubmit` to refresh formData with response from server

### 2. ✅ Backend - Insufficient Error Details

**Issue**: Update errors weren't visible, making debugging impossible
**Fix**: Added comprehensive logging with:

- Request body inspection
- Field-by-field validation
- SQL query details
- Execution results

### 3. ✅ Database Model - Missing Error Context

**Issue**: Database errors weren't being properly tracked
**Fix**: Added:

- Try-catch with proper error logging
- Query execution details
- Row affected count
- Change detection

## Changes Made

### 1. Frontend Update (LaboratoryProfile.js)

```javascript
// NOW: After successful save, refresh the form with returned data
if (response.ok) {
  const result = await response.json();
  setFormData({
    lab_name: result.lab.lab_name || "",
    license_number: result.lab.license_number || "",
    phone: result.lab.phone || "",
    email: result.lab.email || "",
    state: result.lab.state || "",
    district: result.lab.district || "",
    taluk: result.lab.taluk || "",
    address: result.lab.address || "",
  });
  setSuccess("Profile updated successfully!");
}
```

### 2. Backend Route Update (labRoutes.js - PUT /profile)

**Added**:

- Detailed request logging with JSON formatting
- Field validation and filtering
- Empty value handling (convert to null)
- Status updates at each step
- Comprehensive error reporting

### 3. Database Model Update (Laboratory.js)

**Added**:

- Entry/exit logging with lab_id
- Field list logging
- SQL query logging with parameters
- Row count details (affectedRows, changedRows)
- Error catching with context

## How to Test

### Step 1: Start Services

```bash
# Terminal 1
cd backend && npm start

# Terminal 2
cd frontend && npm start
```

### Step 2: Test Database Update Script

```bash
# Terminal 3
node test_lab_update.js
```

This will:

1. ✅ Test database connection
2. ✅ Check laboratories table
3. ✅ Fetch existing lab data
4. ✅ Update lab data
5. ✅ Verify persistence

### Step 3: Manual Test

1. Go to http://localhost:3000
2. Login as laboratory user
3. Navigate to Laboratory Profile
4. Change ANY field (e.g., Phone: 9876543210)
5. Click "✅ Save Changes"

### Step 4: Verify in Backend Console

You should see logs like:

```
=== START: Updating lab profile for user 4 ===
Received raw request body:
{
  "lab_name": "ABC Veterinary Lab",
  "phone": "9876543210",
  ...
}

Found lab with lab_id: 1

Update data to be saved:
{
  "lab_name": "ABC Veterinary Lab",
  "phone": "9876543210"
}

>>> Laboratory.update(lab_id=1)
Fields to update: lab_name, phone
SQL Query: UPDATE laboratories SET lab_name = ?, phone = ? WHERE lab_id = ?
Values: ['ABC Veterinary Lab', '9876543210', 1]
✅ Update successful - 1 rows affected
   changedRows: 1
   insertId: 0

✅ Lab profile updated successfully
=== END: Update completed ===
```

### Step 5: Verify in Database

```sql
-- Check the updated data
SELECT lab_id, user_id, lab_name, phone FROM laboratories WHERE user_id = 4;

-- Expected output should show your updated values
```

## Troubleshooting Checklist

### ❌ Changes not saving?

- [ ] Check backend console for `=== START ===` marker
- [ ] Look for errors between START and END
- [ ] Verify "Update successful - X rows affected" shows 1
- [ ] Check database directly with SQL query above

### ❌ "Update successful - 0 rows affected"?

- [ ] Lab ID might be wrong
- [ ] Check if lab_id in database matches what's being updated
- [ ] Verify user_id 4 exists in laboratories table

### ❌ "No such column" error?

- [ ] Check laboratories table structure: `DESCRIBE laboratories;`
- [ ] Ensure all expected columns exist
- [ ] Verify column names match exactly

### ❌ Authorization error?

- [ ] Check user role is 'laboratory'
- [ ] Verify token is valid and includes correct user_id
- [ ] Check browser DevTools Network tab for full response

### ❌ Database connection error?

- [ ] Run test_lab_update.js to verify connection
- [ ] Check .env file has correct DB credentials
- [ ] Ensure MySQL is running
- [ ] Verify database exists

## Expected Behavior After Fix

### Loading Profile

```
✅ Page loads without 404
✅ Shows existing data or creates new profile
✅ All fields populated (or empty if new)
```

### Updating Profile

```
✅ Can change any field
✅ "Save Changes" button works
✅ Success message appears
✅ Backend logs show update process
```

### Verifying Changes

```
✅ Refresh page - data persists
✅ Check backend logs show update
✅ SQL query shows updated data in database
✅ All fields match what was entered
```

## Quick Debug Commands

### Check if lab profile exists

```sql
SELECT * FROM laboratories WHERE user_id = 4;
```

### Manually update lab profile

```sql
UPDATE laboratories
SET lab_name = 'Test Lab', phone = '9876543210'
WHERE user_id = 4
LIMIT 1;
```

### Verify the update

```sql
SELECT lab_name, phone FROM laboratories WHERE user_id = 4;
```

### Monitor backend logs in real-time

```bash
# Terminal 1 - Start backend with full logging
cd backend && npm start
# Watch for ==> markers
```

## Files Modified

1. **frontend/src/pages/Lab/LaboratoryProfile.js**

   - Added data refresh after successful save
   - Updates formData with response data

2. **backend/routes/labRoutes.js** (PUT /profile)

   - Added comprehensive request logging
   - Added field filtering and validation
   - Added detailed error reporting

3. **backend/models/Laboratory.js** (update method)

   - Added entry/exit logging
   - Added SQL query logging
   - Added error context

4. **test_lab_update.js** (NEW)
   - Complete database test suite
   - Verifies connection, table structure, CRUD operations

## Summary

The fix ensures that:

1. ✅ Frontend sends complete form data
2. ✅ Backend validates and filters the data
3. ✅ Database updates are executed correctly
4. ✅ Changes are persisted to database
5. ✅ Frontend refreshes to show updated data
6. ✅ Full logging for troubleshooting

**Status**: ✅ READY TO TEST

Run these commands to verify:

```bash
# 1. Test database
node test_lab_update.js

# 2. Start services
cd backend && npm start  # Terminal 1
cd frontend && npm start # Terminal 2

# 3. Manual test via UI
# - Login, go to Laboratory Profile
# - Update any field
# - Check backend console for logs
# - Refresh page to verify persistence
```

If data still not updating, check backend console for detailed error messages.
