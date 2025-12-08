# 🧪 Database Update Test Guide - Laboratory Profile

## ⚡ Quick Summary

- ✅ Management section removed from Navigation
- 🔍 Testing database update functionality
- 📝 Comprehensive debugging guide

---

## 🧪 Test Step 1: Direct Database Query

Run this in MySQL to verify your database connection and table:

```sql
-- Check if lab profile exists
SELECT * FROM laboratories WHERE user_id = 4;

-- If it doesn't exist, create one for testing
INSERT INTO laboratories (user_id, lab_name, license_number, phone, email, state, district, taluk, address)
VALUES (4, 'Test Lab', 'LIC-TEST-001', '9999999999', 'test@lab.com', 'Karnataka', 'Bengaluru', '', '');

-- Verify it was created
SELECT * FROM laboratories WHERE user_id = 4;
```

---

## 🧪 Test Step 2: Manual Update in Database

```sql
-- Manually update the lab record
UPDATE laboratories
SET lab_name = 'Updated Test Lab', phone = '8888888888'
WHERE user_id = 4;

-- Verify the update
SELECT lab_name, phone FROM laboratories WHERE user_id = 4;
```

**Expected Result**: Phone shows `8888888888`, name shows `Updated Test Lab`

If this works, your database is fine. If it doesn't, there's a database issue.

---

## 🧪 Test Step 3: Frontend Manual Test

1. **Start Backend**

   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend** (new terminal)

   ```bash
   cd frontend
   npm start
   ```

3. **Login**

   - URL: http://localhost:3000
   - User: thejas math
   - Password: mthejas18@gmail.com

4. **Navigate to Profile**

   - Click: Laboratory → Laboratory Profile
   - Verify: Page loads without error

5. **Test Update**

   - Change Phone to: `7777777777`
   - Change Lab Name to: `My Updated Lab`
   - Click: "✅ Save Changes"

6. **Check Results**
   - ✅ Success message appears?
   - ✅ Form data updates?
   - Refresh page (F5)
   - ✅ Data still there?

---

## 🔍 Debug Checklist

### If changes don't save:

- [ ] **Check Browser Console** (F12)

  - Look for any JavaScript errors
  - Check Network tab → find PUT request
  - Click the request → see Response (should be 200 OK)

- [ ] **Check Backend Console**

  - Look for these logs:
    ```
    === START: Updating lab profile for user 4 ===
    Received raw request body: { ... }
    ✅ Update successful - 1 rows affected
    === END: Update completed ===
    ```

- [ ] **Check Database Directly**

  ```sql
  SELECT * FROM laboratories WHERE user_id = 4;
  ```

  - Are the changes there?

- [ ] **Check API Response**
  - In Network tab, check PUT response
  - Should show: `{ "message": "Profile updated", "lab": { ... } }`

---

## 🧪 Test Step 4: Complete End-to-End Trace

This tests the entire flow:

1. **Update Profile in UI**
2. **Monitor Backend Logs** (should see all steps)
3. **Check Database** (manually query)
4. **Refresh Page** (data should persist)

```bash
# Terminal 1: Backend with full logging
cd backend && npm start

# Terminal 2: Frontend
cd frontend && npm start

# Terminal 3: Monitor database changes (optional)
# Every 5 seconds, run:
mysql -u user -p database -e "SELECT lab_name, phone FROM laboratories WHERE user_id = 4;"
```

---

## ✅ Expected Behavior (After Fix)

```
Frontend Update
    ↓
PUT /api/labs/profile
    ↓
Backend receives data → logs it
    ↓
Database UPDATE executes
    ↓
Database SELECT retrieves updated data
    ↓
Response sent to frontend
    ↓
Frontend updates form with response
    ↓
Success message shown
    ↓
Refresh page → Data persists ✅
```

---

## 🆘 Common Issues & Solutions

| Issue                        | Cause                 | Solution                         |
| ---------------------------- | --------------------- | -------------------------------- |
| "0 rows affected"            | Lab ID mismatch       | Check if lab exists in DB        |
| Network Error                | Backend not running   | Start backend on port 5000       |
| Authorization Error          | Invalid token         | Logout and login again           |
| "Cannot read property 'lab'" | Response format issue | Check backend response structure |
| Data disappears on refresh   | Not actually saved    | Check database directly          |

---

## 📝 What Was Changed Today

### Navigation.js

- ✅ Removed desktop Management dropdown
- ✅ Removed mobile Management section
- ✅ Laboratory section remains intact

### Database Update Flow

- ✅ Frontend refreshes form after successful save
- ✅ Backend logs all steps with detailed info
- ✅ Model logs database operations

---

## 🎯 Next Steps

1. **Test manually** following "Test Step 3" above
2. **Monitor backend** for logs during update
3. **Verify database** changed with SQL query
4. **Check persistence** by refreshing page
5. **Report any errors** found in console logs

---

**Status**: Ready for manual testing  
**Files Modified**: Navigation.js (Management section removed)  
**Next**: Test database update with steps above
