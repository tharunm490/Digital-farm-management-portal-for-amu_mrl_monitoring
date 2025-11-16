# 📦 TEAM SHARING GUIDE

## 🎯 What to Share with Your Team

### ✅ Share These Files:

```
SIH2/
├── .env.example          ← Template (NOT the actual .env!)
├── .gitignore           ← Git ignore rules
├── requirements.txt     ← Dependencies list
├── README.md            ← Project overview
├── SETUP.md             ← Complete setup guide
├── install.ps1          ← Auto-installer
├── start.ps1            ← Start script
├── UPDATE_DATABASE.sql  ← Database schema
├── backend/             ← All backend files
└── frontend/            ← All frontend files
```

### ❌ DO NOT Share:

- `.env` - Contains passwords and API keys!
- `node_modules/` - Too large, they'll install via npm
- Any `.log` files
- `frontend/build/` - Build output

---

## 📋 Instructions for Your Team

Send this message to your teammates:

---

### 📧 Team Message Template:

**Subject: FarmTrack Project Setup**

Hi Team,

I'm sharing the FarmTrack project files. Follow these steps to get started:

**1. Download/Clone the Project**

- Extract all files to your computer
- **Important:** You won't have the `.env` file (it contains secrets)

**2. Install Prerequisites**

- Node.js v16+: https://nodejs.org/
- MySQL v8.0+: https://dev.mysql.com/downloads/

**3. Quick Setup**

```powershell
# Copy environment template
Copy-Item .env.example .env

# Edit .env file and add:
# - Your MySQL password for DB_PASSWORD
# - I'll share API keys separately (DM me)

# Run the installer
.\install.ps1

# Create database in MySQL:
# CREATE DATABASE sih;
# SOURCE path\to\UPDATE_DATABASE.sql;

# Start the app
.\start.ps1
```

**4. Get API Keys from Me**
I'll send you these separately (don't put in GitHub!):

- Google Client ID
- Google Client Secret
- Google Maps API Key

**5. Verify Setup**

- Backend runs on: http://localhost:5000
- Frontend runs on: http://localhost:3000
- Try registering a new account

**Need Help?**
Check `SETUP.md` for detailed instructions and troubleshooting.

---

## 🔐 Sharing API Keys Securely

### Option 1: Direct Message (Recommended)

Send via Slack/Teams/WhatsApp DM:

```
Google OAuth:
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

Google Maps:
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyCt2TdWb8GEaKjxYGXDFQR6co98XjYXzog

Database:
DB_PASSWORD=rakshu@123
```

### Option 2: Password-Protected File

1. Create a text file with credentials
2. Compress with password (WinRAR/7-Zip)
3. Share file + password separately

### Option 3: Team Password Manager

Use tools like:

- LastPass Teams
- 1Password Teams
- Bitwarden

---

## 🗂️ How to Share Files

### Method 1: Git Repository (Best for Teams)

```powershell
# Initialize git (if not done)
git init

# Create .gitignore (already done)
# This excludes .env automatically

# Add files
git add .
git commit -m "Initial commit"

# Push to GitHub/GitLab
git remote add origin <your-repo-url>
git push -u origin main
```

Team members clone:

```powershell
git clone <repo-url>
cd SIH2
Copy-Item .env.example .env
# Edit .env with their values
.\install.ps1
```

### Method 2: Compressed Archive

```powershell
# Create a zip (excluding node_modules and .env)
Compress-Archive -Path * -DestinationPath FarmTrack.zip -Exclude node_modules,.env,frontend/build
```

Upload to:

- Google Drive
- OneDrive
- Dropbox
- WeTransfer

### Method 3: GitHub Release

1. Create a repository
2. Push code (without .env)
3. Create a release/tag
4. Share the release URL

---

## ✅ Team Setup Checklist

Share this checklist with each team member:

```
[ ] Downloaded/cloned all project files
[ ] Installed Node.js (v16+)
[ ] Installed MySQL (v8.0+)
[ ] Created .env from .env.example
[ ] Got API keys from team lead
[ ] Added API keys to .env
[ ] Added MySQL password to .env
[ ] Ran install.ps1 successfully
[ ] Created database: sih
[ ] Imported UPDATE_DATABASE.sql
[ ] Started servers with start.ps1
[ ] Accessed http://localhost:3000
[ ] Registered a test account
[ ] Can login successfully
```

---

## 🚨 Common Issues & Solutions

### "Can't find .env file"

**Solution:** Copy `.env.example` to `.env`

### "npm install failed"

**Solution:**

```powershell
Remove-Item -Recurse node_modules
Remove-Item package-lock.json
npm install
```

### "Database connection error"

**Solution:** Check MySQL is running and password in `.env` is correct

### "Different API keys on different machines"

**Solution:** Each person needs their own `.env` with same keys (get from team lead)

---

## 📞 Team Support

### Documentation Files:

- `README.md` - Quick overview
- `SETUP.md` - Detailed setup guide
- `requirements.txt` - All dependencies
- `TEAM-GUIDE.md` - This file

### Getting Help:

1. Check SETUP.md troubleshooting
2. Review error messages
3. Verify .env configuration
4. Ask team lead

---

## 🎓 Best Practices

### For Everyone:

✅ Keep `.env` file private  
✅ Use `.env.example` as template  
✅ Pull latest changes before working  
✅ Commit with clear messages  
✅ Test before pushing

### For Team Lead:

✅ Create `.env.example` with all keys (but dummy values)  
✅ Share real API keys securely  
✅ Set up Git repository  
✅ Document any custom setup steps  
✅ Help teammates with setup issues

---

**Last Updated:** November 2025  
**For Questions:** Contact Team Lead
