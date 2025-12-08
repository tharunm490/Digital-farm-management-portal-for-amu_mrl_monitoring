# 🔐 Google Login Troubleshooting Guide

## Error: `callback_error` on Login

If you see: `http://localhost:3000/login?error=callback_error`

This means the Google OAuth callback failed. Follow these steps to diagnose and fix.

---

## ✅ Step 1: Verify Environment Variables

The `.env` file must have these variables configured:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Backend URLs
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=sih
DB_PORT=3306

# Secrets
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_key_here
```

### Check if .env is properly configured:

```powershell
# View your .env file
Get-Content .env
```

---

## ✅ Step 2: Verify Google Cloud Console Setup

1. **Go to**: https://console.cloud.google.com/
2. **Select your project**
3. **Go to**: APIs & Services → Credentials
4. **Find your OAuth 2.0 Client ID** and click it
5. **Under "Authorized redirect URIs", add**:

   ```
   http://localhost:5000/api/auth/google/callback
   ```

   **IMPORTANT**: The URL must match exactly with `GOOGLE_CALLBACK_URL` in your `.env`

6. **Save and copy**:
   - Client ID → `GOOGLE_CLIENT_ID`
   - Client Secret → `GOOGLE_CLIENT_SECRET`

---

## ✅ Step 3: Check Backend Logs

Run the backend with verbose logging:

```powershell
cd backend
npm start
# or for auto-reload:
npm run dev
```

Look for logs like:

```
✅ Google OAuth callback - Role: laboratory Email: user@example.com
Creating new user for role: laboratory
✅ User created with ID: 123
Creating laboratory profile...
✅ Laboratory profile created
```

**If you see an error**, it will show:

```
❌ Google callback error: {
  message: 'Database connection failed',
  email: 'user@example.com',
  role: 'laboratory',
  timestamp: '2024-12-08...'
}
```

---

## ✅ Step 4: Common Issues & Solutions

### Issue 1: "Database connection failed"

**Cause**: Database not running or credentials wrong

**Fix**:

```powershell
# Check MySQL is running
Get-Service MySQL* | Select-Object Status

# Verify credentials in .env
Get-Content .env | grep DB_
```

### Issue 2: "Column not found"

**Cause**: Database schema not imported

**Fix**:

```sql
-- In MySQL:
USE sih;
SOURCE C:\path\to\UPDATE_DATABASE.sql;
```

### Issue 3: "Invalid redirect URI"

**Cause**: Google Console callback URL doesn't match .env

**Fix**:

1. Check `.env`: `GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback`
2. Check Google Console: Add exact same URL to "Authorized redirect URIs"
3. Restart backend

### Issue 4: "GOOGLE_CLIENT_ID not set"

**Cause**: .env file not loaded or variables missing

**Fix**:

```powershell
# Verify .env exists and has values
Test-Path .env
Get-Content .env | Select-String GOOGLE
```

### Issue 5: "Role not recognized"

**Cause**: Didn't select a valid role (authority, veterinarian, distributor, laboratory)

**Fix**:

- Only these roles support Google login
- Farmers must use Aadhaar + OTP login

---

## ✅ Step 5: Test Google OAuth Flow

### Option A: Direct Test

```powershell
cd backend
node test-google-auth.js
```

### Option B: Manual Test via Frontend

1. Go to http://localhost:3000/login
2. Select "Laboratory" (or other non-farmer role)
3. Click "Continue with Google"
4. Complete Google login
5. Check backend logs for errors

---

## ✅ Step 6: Database Verification

Check if user was created despite error:

```sql
-- In MySQL:
USE sih;
SELECT user_id, email, role, google_uid FROM users WHERE email = 'your_email@example.com';
SELECT * FROM laboratory WHERE email = 'your_email@example.com';
```

---

## 🚨 Still Not Working?

### Collect Debug Information:

1. **Backend logs** (from npm start output):

   - Copy the full error message from "❌ Google callback error"

2. **Environment check**:

   ```powershell
   Get-Content .env | Select-String -Pattern "GOOGLE|JWT|DB_"
   ```

3. **MySQL check**:

   ```sql
   SELECT VERSION();
   USE sih;
   SHOW TABLES;
   ```

4. **Browser console** (DevTools F12):
   - Check "Network" tab for failed requests
   - Check "Console" for JavaScript errors

### Contact Support with:

- Full error message from backend logs
- Your `.env` variables (HIDE SECRETS!)
- MySQL version
- Node.js version (`node --version`)

---

## 📚 Additional Resources

- [Google OAuth Setup Guide](SETUP.md)
- [Backend Routes Documentation](backend/routes/authRoutes.js)
- [Passport.js Configuration](backend/config/passport.js)

---

## ✅ Quick Checklist

Before asking for help, verify:

- [ ] `.env` file exists and is properly formatted
- [ ] `GOOGLE_CLIENT_ID` is not empty
- [ ] `GOOGLE_CLIENT_SECRET` is not empty
- [ ] `GOOGLE_CALLBACK_URL` matches Google Cloud Console
- [ ] MySQL is running (`net start MySQL80`)
- [ ] Database `sih` exists
- [ ] Schema is imported (`UPDATE_DATABASE.sql`)
- [ ] Backend is running on port 5000
- [ ] Frontend is running on port 3000
- [ ] No spaces or special characters in credentials

Once all checks pass, try Google login again.
