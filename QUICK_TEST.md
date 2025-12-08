# 🚀 QUICK TEST GUIDE - Laboratory Profile Database Update

## ⚡ 5-Minute Test

### Start Services (2 terminals)

```bash
# Terminal 1
cd c:\Users\Raksha\OneDrive\Desktop\SIH2\backend
npm start

# Terminal 2
cd c:\Users\Raksha\OneDrive\Desktop\SIH2\frontend
npm start
```

### Quick Manual Test

1. Open http://localhost:3000
2. Login: `thejas math` / `mthejas18@gmail.com`
3. Click: Laboratory → Laboratory Profile
4. ✅ Verify: No 404 error, profile loads
5. Change Phone: `9876543210`
6. Click: "✅ Save Changes"
7. ✅ Verify: Success message appears
8. Refresh page (F5)
9. ✅ Verify: Phone number is still `9876543210`

### Check Backend Logs

Look for:

```
=== START: Updating lab profile for user 4 ===
✅ Update successful - 1 rows affected
=== END: Update completed ===
```

---

## 🧪 Full Database Test

```bash
# Terminal 3
cd c:\Users\Raksha\OneDrive\Desktop\SIH2
node test_lab_update.js
```

Expected output:

```
✅ Database connection successful
✅ Laboratories table exists
✅ Laboratory profile found
✅ Update executed: 1 rows affected
✅ DATA PERSISTENCE VERIFIED
```

---

## 🔍 Verify in Database

```sql
-- Quick check
SELECT lab_id, lab_name, phone FROM laboratories WHERE user_id = 4;

-- Should show your updated values
```

---

## ✅ Success Criteria

All must be true:

- [ ] Profile page loads without 404 error
- [ ] Profile data displays (shows existing or creates new)
- [ ] Can edit fields without errors
- [ ] Save Changes button is clickable
- [ ] Success message appears after save
- [ ] Backend console shows update logs with timestamps
- [ ] Page refresh shows persisted data
- [ ] Database SELECT query shows updated values

---

## ❌ If Something Goes Wrong

### Logs show "0 rows affected"

→ Lab might not exist or lab_id is wrong

### Logs show database error

→ Check DESCRIBE laboratories; for correct column names

### Changes disappear after refresh

→ Update might have failed - check backend logs

### Authorization error

→ Check user role is 'laboratory'

### Connection error

→ Run: `node test_lab_update.js` to diagnose

---

## 📞 Key Files for Debugging

1. Backend logs: Look in Terminal 1 (backend npm start)
2. Frontend logs: Browser console (F12)
3. Database: `SELECT * FROM laboratories WHERE user_id = 4;`

Run: `node test_lab_update.js` to test everything at once!
