# 🌾 FarmTrack - Digital Farm Management System

A comprehensive digital platform for farm management with Animal Medicine Log (AML) and Maximum Residue Limit (MRL) monitoring, QR-based verification, and Google OAuth integration.

---

## 🎯 Features

### ✅ Core Functionality

- **User Authentication** - Register, Login, Google OAuth
- **Farm Management** - Add farms with GPS location and interactive maps
- **Batch/Animal Tracking** - Track livestock batches with detailed records
- **Treatment Recording** - Log medical treatments with drug details
- **AMU Monitoring** - Track antimicrobial usage
- **MRL Compliance** - Monitor maximum residue limits
- **QR Code System** - Generate and verify QR codes for entities
- **Withdrawal Period** - Automatic calculation and compliance checking
- **Mobile Access** - Full mobile device support

### 🔐 User Roles

- **Admin** - Full system access
- **Inspector** - View and verify records
- **Farmer** - Manage own farms and animals

---

## 🚀 Quick Setup

### For Team Members - First Time Setup

1. **Get the files** from your team lead (DO NOT get the `.env` file)

2. **Install Node.js** (v16+): https://nodejs.org/

3. **Install MySQL** (v8.0+): https://dev.mysql.com/downloads/

4. **Setup Environment**:

   ```powershell
   # Copy the example file
   Copy-Item .env.example .env

   # Edit .env and fill in your values:
   # - DB_PASSWORD (your MySQL password)
   # - Ask team lead for Google API keys
   ```

5. **Install Dependencies**:

   ```powershell
   # Backend
   cd backend
   npm install

   # Frontend
   cd ..\frontend
   npm install
   ```

6. **Setup Database**:

   - Open MySQL and create database: `CREATE DATABASE sih;`
   - Import: `SOURCE C:\path\to\SIH2\UPDATE_DATABASE.sql;`

7. **Start Application**:
   ```powershell
   cd ..
   .\start.ps1
   ```

Visit: **http://localhost:3000**

📖 **See [SETUP.md](SETUP.md) for detailed instructions**

---

## 📁 Project Structure

```
SIH2/
├── .env                    # ⚠️ Configuration (DO NOT COMMIT!)
├── .env.example           # Template for team members
├── requirements.txt       # All dependencies
├── SETUP.md              # Detailed setup guide
├── start.ps1             # Start both servers
│
├── backend/              # Node.js + Express API
│   ├── server.js
│   ├── config/
│   ├── models/
│   ├── routes/
│   └── middleware/
│
└── frontend/             # React Application
    └── src/
        ├── components/
        ├── pages/
        └── services/
```

---

## 🔧 Technology Stack

**Backend:** Node.js, Express, MySQL, Passport.js, JWT  
**Frontend:** React 18, React Router, Axios, Google Maps API

---

## 📱 Mobile Access

1. Find your computer's IP: `ipconfig`
2. Update `.env` with your IP (e.g., `192.168.1.100`)
3. Restart servers
4. Visit `http://192.168.1.100:3000` on phone

See [SETUP.md](SETUP.md) for details.

---

## 🔑 API Keys Required

- **Google OAuth 2.0** - For user authentication
- **Google Maps API** - For farm location services

Setup instructions in [SETUP.md](SETUP.md)

---

## 🛠️ Development Commands

```powershell
# Backend
cd backend
npm run dev        # Auto-reload

# Frontend
cd frontend
npm start          # Dev server
```

---

## 👥 Team Collaboration

### ⚠️ IMPORTANT

- **NEVER commit `.env`** file (contains secrets!)
- **Always use `.env.example`** as template
- Each team member creates their own `.env`

---

## 📞 Support

For issues, see [SETUP.md](SETUP.md) troubleshooting section.

---

**Project:** Smart India Hackathon 2025  
**Last Updated:** November 2025
