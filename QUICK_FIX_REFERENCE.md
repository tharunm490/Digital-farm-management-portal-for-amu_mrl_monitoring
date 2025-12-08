# 🚀 QUICK FIX: Laboratory Login Callback Error

## ❌ Problem

```
http://localhost:3000/login?error=callback_error
```

After signing in with Google as a laboratory user.

---

## ✅ Quick Fix (5 minutes)

### 1. Open `.env` and verify it has:

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
JWT_SECRET=any_random_string_here
SESSION_SECRET=any_random_string_here
DB_PASSWORD=your_mysql_password
PORT=5000
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

### 2. If Google credentials are missing:

- Go to: https://console.cloud.google.com/
- APIs & Services → Credentials
- Click your OAuth 2.0 Client ID
- Add redirect URI: `http://localhost:5000/api/auth/google/callback`
- Copy Client ID and Secret to `.env`

### 3. Restart backend:

```powershell
cd backend
npm run dev
```

### 4. Test login at: http://localhost:3000/login

- Select "Laboratory"
- Click "Continue with Google"
- Check backend logs for ✅ success

---

## 🔍 Troubleshooting

### See this in backend logs?

```
❌ Google callback error: {
  message: 'Error message',
  code: 'ER_...'
}
```

**Check these in order**:

| Error Code                           | Issue                   | Fix                                |
| ------------------------------------ | ----------------------- | ---------------------------------- |
| `ER_ACCESS_DENIED_FOR_USER`          | Wrong DB password       | Update `DB_PASSWORD` in `.env`     |
| `ER_NO_REFERENCED_ROW_IN_CONSTRAINT` | Missing database schema | Run `UPDATE_DATABASE.sql` in MySQL |
| Missing module                       | npm packages            | `npm install` in backend folder    |
| `GOOGLE_CLIENT_ID` undefined         | `.env` not loaded       | Restart backend                    |

### Not seeing logs?

```powershell
# Check if backend is running
curl http://localhost:5000/health

# Check if .env is being read
cd backend
node -e "require('dotenv').config(); console.log(process.env.GOOGLE_CLIENT_ID)"
```

---

## 📋 Verification Checklist

```powershell
# 1. .env file exists with credentials
Test-Path .env

# 2. MySQL is running
Get-Service MySQL* | Select-Object Status

# 3. Backend is on port 5000
netstat -ano | grep 5000
# Should show: 5000 is LISTENING

# 4. Database connection works
mysql -u root -p -e "SELECT COUNT(*) FROM sih.users;"
```

---

## 📚 Full Guides

- **Detailed Fix**: `LABORATORY_LOGIN_FIX.md`
- **Troubleshooting**: `GOOGLE_LOGIN_TROUBLESHOOTING.md`
- **Changes Summary**: `CALLBACK_ERROR_FIX_SUMMARY.md`

---

## 💡 Key Points

1. ✅ `.env` is in **project root**, not in `backend/`
2. ✅ `GOOGLE_CALLBACK_URL` must match exactly in Google Console
3. ✅ Backend must be on **port 5000**, frontend on **3000**
4. ✅ MySQL must be **running** before starting backend
5. ✅ Database schema must be **imported** from `UPDATE_DATABASE.sql`

---

## 🎯 Test Command

```powershell
# Full test sequence
cd backend
npm install
npm run dev

# In another terminal
cd frontend
npm start

# In browser: http://localhost:3000/login
# Select: Laboratory
# Click: Continue with Google
# Expected: ✅ Redirects to dashboard
```

---

**If still stuck after this, follow the detailed guides above.** ⬆️
