# 🚀 RAILWAY DEPLOYMENT GUIDE - STEP BY STEP

## ✅ STEP 1: Create Railway Account

1. Go to: https://railway.app
2. Click "Login" → Sign in with **GitHub** or **Google**
3. Verify your email if needed

---

## ✅ STEP 2: Create MySQL Database on Railway

1. In Railway dashboard, click **"New Project"**
2. Click **"Provision MySQL"**
3. Railway will create a MySQL database
4. Click on the **MySQL** service
5. Go to **"Variables"** tab
6. **COPY THESE VALUES** (you'll need them):
   - `MYSQL_HOST`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`
   - `MYSQL_PORT`

---

## ✅ STEP 3: Import Your Database Schema

1. Click on MySQL service → **"Data"** tab
2. Or use the connection details to connect via MySQL Workbench
3. **Run these SQL files**:

   - `database_update.sql`
   - `treatment_schema_update.sql`

   OR manually create tables from your local database

---

## ✅ STEP 4: Deploy Backend to Railway

### Option A: Deploy from GitHub (RECOMMENDED)

1. Push your code to GitHub first:

   ```bash
   cd C:\Users\Raksha\OneDrive\Desktop\SIH2
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR-USERNAME/farmtrack.git
   git push -u origin main
   ```

2. In Railway dashboard:

   - Click **"New"** → **"GitHub Repo"**
   - Select your repository
   - Railway will auto-detect it's a Node.js app

3. **Set Environment Variables**:
   Click on your backend service → **"Variables"** tab → Add these:

   ```
   DB_HOST=<MySQL_HOST from Step 2>
   DB_USER=<MySQL_USER from Step 2>
   DB_PASSWORD=<MySQL_PASSWORD from Step 2>
   DB_NAME=<MySQL_DATABASE from Step 2>
   DB_PORT=<MySQL_PORT from Step 2>
   PORT=5000
   FRONTEND_URL=https://your-frontend.up.railway.app
   QR_FRONTEND_URL=https://your-frontend.up.railway.app
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=https://YOUR-BACKEND-URL.up.railway.app/api/auth/google/callback
   JWT_SECRET=your_jwt_secret_key_production
   SESSION_SECRET=your_session_secret_production
   ```

4. Railway will automatically deploy
5. Click **"Settings"** → **"Generate Domain"**
6. **COPY YOUR BACKEND URL**: `https://xxxxx.up.railway.app`

### Option B: Deploy from Local (If no GitHub)

1. Install Railway CLI:

   ```bash
   npm install -g @railway/cli
   ```

2. Login:

   ```bash
   railway login
   ```

3. Deploy backend:
   ```bash
   cd backend
   railway init
   railway up
   ```

---

## ✅ STEP 5: Deploy Frontend to Railway

1. Update `frontend/.env` with backend URL:

   ```
   REACT_APP_API_URL=https://YOUR-BACKEND-URL.up.railway.app/api
   REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyCt2TdWb8GEaKjxYGXDFQR6co98XjYXzog
   ```

2. In Railway dashboard:

   - Click **"New"** → **"GitHub Repo"** (select your repo again)
   - Or click **"New"** → **"Empty Project"** → Deploy frontend folder

3. **Configure Build Settings**:

   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npx serve -s build -l $PORT`
   - OR use Railway's static site feature

4. Click **"Settings"** → **"Generate Domain"**
5. **COPY YOUR FRONTEND URL**: `https://yyyyy.up.railway.app`

---

## ✅ STEP 6: Update Google OAuth

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. **Update "Authorized redirect URIs"**:
   - Remove old localhost URLs
   - Add: `https://YOUR-BACKEND-URL.up.railway.app/api/auth/google/callback`
4. **Update "Authorized JavaScript origins"**:
   - Add: `https://YOUR-FRONTEND-URL.up.railway.app`
5. Click **"Save"**

---

## ✅ STEP 7: Update Backend Environment

Go back to Railway → Backend service → **Variables** → Update:

```
FRONTEND_URL=https://YOUR-FRONTEND-URL.up.railway.app
QR_FRONTEND_URL=https://YOUR-FRONTEND-URL.up.railway.app
GOOGLE_CALLBACK_URL=https://YOUR-BACKEND-URL.up.railway.app/api/auth/google/callback
```

Railway will auto-redeploy.

---

## ✅ STEP 8: Test Everything!

1. Open: `https://YOUR-FRONTEND-URL.up.railway.app`
2. Test Google Sign-In ✅
3. Generate QR Code ✅
4. Scan QR from mobile ✅
5. Everything works with HTTPS! ✅

---

## 🎯 SUMMARY

**Your URLs:**

- Backend: `https://xxxxx.up.railway.app`
- Frontend: `https://yyyyy.up.railway.app`
- Database: Railway MySQL (managed)

**Benefits:**
✅ Fully HTTPS
✅ Works on mobile
✅ No "Not Secure" warnings
✅ No tunnels needed
✅ Professional demo for judges
✅ No need to keep laptop running

---

## 📝 QUICK CHECKLIST

- [ ] Railway account created
- [ ] MySQL database provisioned
- [ ] Database schema imported
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Google OAuth updated
- [ ] Environment variables set
- [ ] Test Google Sign-In
- [ ] Test QR code scanning
- [ ] Ready for presentation! 🎉
