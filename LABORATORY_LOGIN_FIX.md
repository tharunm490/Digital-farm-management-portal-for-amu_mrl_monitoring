# 🔧 Google Login Setup for Laboratory Users

## The Problem

When you sign in with a laboratory account using Google OAuth, you get redirected to:

```
http://localhost:3000/login?error=callback_error
```

This means the callback handler failed to complete the login process.

---

## 🎯 Root Causes (Most Common)

1. **Missing `.env` variables** ← Most common
2. **Database not running**
3. **Schema not imported**
4. **Google OAuth callback URL mismatch**

---

## ✅ Fix: Step by Step

### Step 1: Configure `.env` File

Open `.env` in your project root and ensure these are set:

```env
# ========== SERVER CONFIGURATION ==========
PORT=5000
NODE_ENV=development

# ========== DATABASE CONFIGURATION ==========
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=                    # ← CHANGE THIS to your MySQL password
DB_NAME=sih
DB_PORT=3306

# ========== JWT & SESSION ==========
JWT_SECRET=your_jwt_secret_key_change_this_in_production
SESSION_SECRET=your_session_secret_key_change_this_in_production

# ========== FRONTEND URLS ==========
FRONTEND_URL=http://localhost:3000
QR_FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# ========== GOOGLE OAUTH 2.0 ==========
GOOGLE_CLIENT_ID=your_google_client_id_here          # ← GET FROM GOOGLE CONSOLE
GOOGLE_CLIENT_SECRET=your_google_client_secret_here  # ← GET FROM GOOGLE CONSOLE
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# ========== GOOGLE APIS ==========
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 2: Get Google OAuth Credentials

1. Go to: https://console.cloud.google.com/
2. Create/Select your project
3. Go to: **APIs & Services** → **Credentials**
4. Click on your **OAuth 2.0 Client ID**
5. Under "Authorized redirect URIs", add:

   ```
   http://localhost:5000/api/auth/google/callback
   ```

   **Save changes**

6. Copy your credentials:
   - **Client ID** → `GOOGLE_CLIENT_ID` in `.env`
   - **Client Secret** → `GOOGLE_CLIENT_SECRET` in `.env`

### Step 3: Verify MySQL Connection

```powershell
# Start MySQL (if not already running)
net start MySQL80

# Or for MariaDB:
net start MariaDB

# Or use MySQL Workbench
```

### Step 4: Import Database Schema

```powershell
# Open MySQL CLI
mysql -u root -p

# In MySQL, run:
CREATE DATABASE sih;
USE sih;
SOURCE C:\path\to\SIH2\UPDATE_DATABASE.sql;

# Verify tables exist
SHOW TABLES;
# Should show: users, laboratories, treatments, etc.
```

### Step 5: Restart Backend Server

```powershell
# Stop current backend (Ctrl+C in the terminal where it's running)

# Navigate to backend
cd backend

# Install dependencies (if not done)
npm install

# Start the server
npm start
# or with auto-reload:
npm run dev
```

You should see:

```
✅ Server running on http://localhost:3000
✅ Database connected
```

### Step 6: Test Laboratory Login

1. Open frontend: http://localhost:3000/login
2. Select role: **Laboratory**
3. Click: **Continue with Google**
4. Sign in with your Google account
5. **Check backend logs** for success or errors

---

## 🔍 What Happens Behind the Scenes

When you click "Continue with Google" for a laboratory account:

```
Frontend
  ↓
Redirects to: /api/auth/google?role=laboratory
  ↓
Google OAuth Login
  ↓
Google Callback → /api/auth/google/callback
  ↓
Backend validates role (must be: authority, veterinarian, distributor, or laboratory)
  ↓
Check if user exists in DB
  ├─ If exists: Create JWT token → Redirect to frontend with token
  ├─ If new: Create user → Create laboratory profile → Create JWT token → Redirect
  ↓
Frontend receives token and stores in localStorage
  ↓
Dashboard loads ✅
```

---

## 🚨 Debug: Check Backend Logs

When testing, watch the backend terminal for logs:

**Success logs:**

```
✅ Google OAuth callback - Role: laboratory Email: user@example.com
Creating new user for role: laboratory
✅ User created with ID: 123
Creating laboratory profile...
✅ Laboratory profile created
```

**Error logs will show:**

```
❌ Google callback error: {
  message: 'Error message here',
  email: 'user@example.com',
  role: 'laboratory',
  code: 'ER_DUP_ENTRY',  // If unique constraint violated
  timestamp: '2024-12-08T10:30:00.000Z'
}
```

---

## 📋 Common Errors & Fixes

| Error                                  | Cause                   | Fix                                                      |
| -------------------------------------- | ----------------------- | -------------------------------------------------------- |
| `Cannot find module 'express-session'` | Missing npm packages    | Run `npm install` in backend folder                      |
| `ER_ACCESS_DENIED_FOR_USER`            | Wrong DB password       | Update `DB_PASSWORD` in `.env`                           |
| `ER_NO_REFERENCED_ROW_IN_CONSTRAINT`   | Missing database schema | Run `UPDATE_DATABASE.sql` in MySQL                       |
| `Invalid redirect URI`                 | Callback URL mismatch   | Verify Google Console matches `GOOGLE_CALLBACK_URL`      |
| `GOOGLE_CLIENT_ID not found`           | `.env` not loaded       | Ensure `.env` exists in project root (not in backend/)   |
| `No user in Google callback`           | req.user is undefined   | Check browser → Application → Cookies for session issues |

---

## ✅ Verification Checklist

Before testing, verify all of these:

```powershell
# 1. Check .env exists and has values
Get-Content .env | Select-String "GOOGLE_CLIENT_ID"
# Should show: GOOGLE_CLIENT_ID=abc123...

# 2. Check MySQL is running
Get-Service MySQL* | Select-Object Status
# Should show: Running

# 3. Check database exists
mysql -u root -p -e "SHOW DATABASES;" | grep sih

# 4. Check Node version
node --version
# Should be v14+ (preferably v16+)

# 5. Check npm is working
npm --version
```

---

## 🧪 Test Google OAuth Configuration

Run this test script:

```powershell
cd backend
node test-google-auth.js
```

This will show:

- ✅ If GOOGLE_CLIENT_ID is set
- ✅ If GOOGLE_CLIENT_SECRET is set
- ✅ What callback URL will be used
- ✅ What to configure in Google Console

---

## 🎓 How Each Role Logs In

| Role             | Method            | Notes                              |
| ---------------- | ----------------- | ---------------------------------- |
| **Farmer**       | Aadhaar + CAPTCHA | Mobile phone friendly              |
| **Veterinarian** | Google OAuth      | Must complete profile after signup |
| **Authority**    | Google OAuth      | Must complete profile after signup |
| **Distributor**  | Google OAuth      | Must complete profile after signup |
| **Laboratory**   | Google OAuth      | Must complete profile after signup |

---

## 📞 Still Having Issues?

### Collect This Information:

1. **Full error message from backend logs**
2. **Your .env values** (hide the secrets):
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CALLBACK_URL=...
   BACKEND_URL=...
   FRONTEND_URL=...
   ```
3. **MySQL status**:
   ```sql
   SELECT VERSION();
   USE sih;
   SHOW TABLES;
   ```
4. **Browser console error** (Press F12 in browser)

---

## 📚 Related Files

- [Full Troubleshooting Guide](GOOGLE_LOGIN_TROUBLESHOOTING.md)
- [Setup Guide](SETUP.md)
- [Authentication Routes](backend/routes/authRoutes.js)
- [Passport Configuration](backend/config/passport.js)

---

## ✨ Quick Commands

```powershell
# Start everything
cd backend
npm run dev      # Terminal 1

# Terminal 2:
cd frontend
npm start

# View .env (check configuration)
Get-Content .env

# Check MySQL
mysql -u root -p -e "USE sih; SELECT COUNT(*) FROM users;"

# Test Google OAuth config
cd backend
node test-google-auth.js
```
