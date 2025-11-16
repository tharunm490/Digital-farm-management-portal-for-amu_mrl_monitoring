# 🌾 FARMTRACK - COMPLETE SETUP GUIDE

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MySQL** (v8.0 or higher) - [Download](https://dev.mysql.com/downloads/)
- **Git** (optional) - [Download](https://git-scm.com/)

## 🚀 Quick Start (5 Minutes)

### Step 1: Environment Setup

1. Copy `.env.example` to `.env` in the root folder
2. Open `.env` and update these values:
   ```env
   DB_PASSWORD=your_mysql_password
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   REACT_APP_GOOGLE_MAPS_API_KEY=your_maps_api_key
   ```

### Step 2: Install Dependencies

```powershell
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 3: Setup Database

1. Open MySQL and create database:
   ```sql
   CREATE DATABASE sih;
   USE sih;
   ```
2. Import the database schema:
   ```sql
   SOURCE C:\path\to\SIH2\UPDATE_DATABASE.sql;
   ```

### Step 4: Run the Application

```powershell
# From root directory, run:
.\start.ps1
```

The application will start:

- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:3000

---

## 📱 Mobile Access Setup

To access from your phone (same WiFi):

1. Find your computer's IP address:

   ```powershell
   ipconfig
   # Look for "IPv4 Address" under your WiFi adapter
   # Example: 192.168.1.100
   ```

2. Update `.env` file:

   ```env
   FRONTEND_URL=http://192.168.1.100:3000
   QR_FRONTEND_URL=http://192.168.1.100:3000
   REACT_APP_API_URL=http://192.168.1.100:5000/api
   ```

3. Restart both servers

4. On your phone, visit: `http://192.168.1.100:3000`

---

## 📁 Project Structure

```
SIH2/
├── .env                    # Main configuration file (CONFIGURE THIS!)
├── .env.example           # Template for environment variables
├── requirements.txt       # List of all dependencies
├── SETUP.md              # This file
├── README.md             # Project overview
├── start.ps1             # Start both servers
├── backend/
│   ├── server.js         # Express server
│   ├── package.json      # Backend dependencies
│   ├── config/           # Database & auth config
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   └── middleware/       # Authentication middleware
└── frontend/
    ├── package.json      # Frontend dependencies
    ├── public/           # Static files
    └── src/
        ├── components/   # Reusable components
        ├── pages/        # Page components
        ├── services/     # API services
        └── context/      # React context
```

---

## 🔑 API Keys Required

### Google OAuth 2.0

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
6. Copy Client ID and Secret to `.env`

### Google Maps API

1. In Google Cloud Console, enable "Maps JavaScript API"
2. Create API key
3. Add to `.env` as `REACT_APP_GOOGLE_MAPS_API_KEY`

---

## 🗄️ Database Schema

The database includes these main tables:

- **users** - User accounts (farmers, inspectors, admins)
- **farms** - Farm locations and details
- **animals_or_batches** - Livestock/batch tracking
- **treatments** - Medical treatments
- **amu_records** - Antimicrobial usage records
- **mrl_limits** - Maximum residue limits
- **qr_codes** - QR code mappings

---

## 🛠️ Troubleshooting

### Backend won't start

```powershell
# Check if MySQL is running
Get-Service MySQL*

# Check if port 5000 is available
netstat -ano | findstr :5000
```

### Frontend won't start

```powershell
# Clear cache and reinstall
cd frontend
Remove-Item -Recurse node_modules
Remove-Item package-lock.json
npm install
```

### Database connection error

- Verify MySQL is running
- Check credentials in `.env`
- Ensure database `sih` exists

### Mobile can't connect

- Ensure phone and computer are on same WiFi
- Check firewall settings (allow ports 3000 and 5000)
- Verify IP address is correct

---

## 📝 Development Commands

### Backend

```powershell
cd backend
npm start          # Start server
npm run dev        # Start with auto-reload (nodemon)
```

### Frontend

```powershell
cd frontend
npm start          # Start development server
npm run build      # Create production build
```

---

## 👥 Team Collaboration

### Share with Team

1. **DO NOT share `.env` file** (contains secrets!)
2. Share these files:
   - `.env.example` - They copy this to `.env`
   - `requirements.txt` - Dependencies list
   - `SETUP.md` - Setup instructions
   - All code files

### Git Setup (Recommended)

```powershell
# Initialize git (if not already)
git init

# The .gitignore file already excludes .env
# Add all files except .env
git add .
git commit -m "Initial commit"

# Each team member clones and creates their own .env
```

---

## 🔒 Security Notes

1. **Never commit `.env`** - Contains passwords and API keys
2. **Change default secrets** - Update JWT_SECRET and SESSION_SECRET
3. **Use strong passwords** - For MySQL and admin accounts
4. **HTTPS in production** - Use SSL certificates for live deployment

---

## ✅ Verification Checklist

- [ ] MySQL installed and running
- [ ] Node.js installed (check: `node --version`)
- [ ] `.env` file configured with all values
- [ ] Backend dependencies installed (`npm install` in backend/)
- [ ] Frontend dependencies installed (`npm install` in frontend/)
- [ ] Database created and schema imported
- [ ] Backend starts successfully (http://localhost:5000)
- [ ] Frontend starts successfully (http://localhost:3000)
- [ ] Can register a new user
- [ ] Can login successfully
- [ ] Can add a farm with map location

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review error messages in terminal
3. Verify all steps in the checklist
4. Check `.env` file configuration

---

**Last Updated:** November 2025
**Version:** 1.0.0
