# Laboratory Profile Fix - Testing Guide

## Issues Fixed

### 1. **API Endpoint Mismatch** ✅

- **Problem**: Frontend was calling `/api/lab/profile` but backend routes were registered at `/api/labs`
- **Solution**: Updated frontend to use `/api/labs/profile` for both GET and PUT requests
- **Files modified**: `frontend/src/pages/Lab/LaboratoryProfile.js`

### 2. **Enhanced Error Logging** ✅

- **Problem**: Server errors weren't providing enough context for debugging
- **Solution**: Added detailed console logging to:
  - `backend/routes/labRoutes.js` - GET and PUT profile endpoints
  - `backend/models/Laboratory.js` - update method

## How to Test

### Step 1: Start the Backend Server

```bash
cd backend
npm start
# Server runs on http://localhost:5000
```

### Step 2: Start the Frontend

```bash
cd frontend
npm start
# Frontend runs on http://localhost:3000
```

### Step 3: Login as Laboratory User

1. Navigate to http://localhost:3000
2. Login with laboratory credentials (thejas math / mthejas18@gmail.com)
3. Go to Laboratory > Laboratory Profile

### Step 4: Verify Profile Loading

- Profile should load without "HTTP error! status: 404"
- If new user, profile will be auto-created
- Fields should display current data (or empty if new)

### Step 5: Update Profile

1. Fill in laboratory details:

   - **Laboratory Name**: ABC Veterinary Lab
   - **License Number**: LIC-2024-001
   - **Phone**: 9876543210
   - **Email**: lab@example.com
   - **State**: Karnataka
   - **District**: Bengaluru
   - **Address**: 123 Lab Street

2. Click "✅ Save Changes"

### Step 6: Verify Database Update

- Check backend console for logs:

  - `Updating lab profile for user [user_id]...`
  - `Received data: { ... }`
  - `✅ Lab profile updated successfully`

- Success message should appear on frontend
- Page should refresh with updated data

### Step 7: Verify Data Persistence

1. Refresh the page (F5)
2. Profile should reload with all previously saved data
3. Fields should not be empty

## Expected Console Output

### Backend Logs (Success Case):

```
Updating lab profile for user 4...
Received data: {
  lab_name: 'ABC Veterinary Lab',
  license_number: 'LIC-2024-001',
  phone: '9876543210',
  email: 'lab@example.com',
  state: 'Karnataka',
  district: 'Bengaluru',
  taluk: '',
  address: '123 Lab Street'
}
Updating lab 1 with new data...
Executing query: UPDATE laboratories SET lab_name = ?, license_number = ?, phone = ?, email = ?, state = ?, district = ?, taluk = ?, address = ? WHERE lab_id = ?
Update result: 1 rows affected
✅ Lab profile updated successfully: {
  lab_id: 1,
  user_id: 4,
  lab_name: 'ABC Veterinary Lab',
  license_number: 'LIC-2024-001',
  ...
}
```

## Database Verification

To manually verify in MySQL:

```sql
-- Check if lab exists
SELECT * FROM laboratories WHERE user_id = 4;

-- Expected output should show all updated fields with correct values
```

## Troubleshooting

| Issue                        | Solution                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| "HTTP error! status: 404"    | Clear browser cache, restart backend server, verify `/api/labs` route is registered |
| Changes don't persist        | Check backend console for database errors, verify database connection               |
| Profile loads but can't save | Check that user has `laboratory` role, verify token in localStorage                 |
| Empty fields after refresh   | Database transaction may have failed, check MySQL error logs                        |

## Summary of Changes

### Frontend

- `/api/lab/profile` → `/api/labs/profile` (GET)
- `/api/lab/profile` → `/api/labs/profile` (PUT)

### Backend

- Added detailed logging to track data flow
- Enhanced error messages with `details` field
- Improved update method logging for debugging

All changes maintain backward compatibility and don't affect other modules.
