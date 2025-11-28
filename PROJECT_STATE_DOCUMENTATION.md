# 📋 DIGITAL FARM MANAGEMENT PORTAL - PROJECT STATE DOCUMENTATION
**Created:** November 27, 2025  
**Purpose:** Complete snapshot of project state before cleanup

---

## 🎯 PROJECT OVERVIEW

### Project Name
**Digital Farm Management Portal for AMU/MRL Monitoring**

### Purpose
A comprehensive livestock management system for Smart India Hackathon 2025 focused on:
- **AMU (Antimicrobial Usage) Tracking** - Monitor antibiotic usage in farm animals
- **MRL (Maximum Residue Limit) Compliance** - Ensure food safety by tracking drug residues
- **Farm-to-Fork Traceability** - QR-based verification system for food processors
- **Multi-stakeholder Platform** - Serves Farmers, Veterinarians, Processors, and Authorities

### Technology Stack
- **Backend:** Node.js, Express, MySQL, Passport.js, JWT
- **Frontend:** React 18, React Router, Axios, Recharts
- **Database:** MySQL (Railway hosted)
- **Authentication:** JWT + Google OAuth (optional)

---

## 📊 CURRENT PROJECT STRUCTURE

### Root Directory Files
```
.env                                    # Environment variables (PRESERVE)
.gitignore                              # Git ignore rules (PRESERVE)
package.json                            # Root package file (if exists)
README.md                               # Project readme
MRL_dataset.xlsx                        # MRL reference data (551KB)
updated_mrl_per_species_matrix_refined2.json  # MRL JSON data (551KB)
s2.sql                                  # Database schema
sih_data.sql                            # Database data
r2.sql                                  # Additional schema
```

### Backend Structure
```
backend/
├── .env                                # Backend environment (PRESERVE)
├── package.json                        # Dependencies (PRESERVE)
├── server.js                           # Main server file (PRESERVE)
├── config/
│   ├── database.js                     # DB configuration (PRESERVE)
│   └── passport.js                     # Auth configuration (PRESERVE)
├── models/                             # 16 model files (PRESERVE ALL)
│   ├── User.js, Farm.js, Batch.js, Entity.js
│   ├── Treatment.js, Vaccination.js, AMU.js
│   ├── MRL.js, DrugMaster.js, ComplianceEngine.js
│   └── ... (all other models)
├── routes/                             # 21 route files (PRESERVE ALL)
│   ├── authRoutes.js, farmRoutes.js, batchRoutes.js
│   ├── treatmentRoutes.js, vaccinationRoutes.js
│   ├── prescriptionRoutes.js, drugRoutes.js
│   ├── withdrawalRoutes.js, verificationRoutes.js
│   ├── analyticsRoutes.js, authorityRoutes.js
│   └── ... (all other routes)
├── middleware/
│   └── auth.js                         # Authentication middleware (PRESERVE)
├── services/                           # Service files (PRESERVE)
└── scripts/                            # Utility scripts (PRESERVE)
```

### Frontend Structure
```
frontend/
├── .env                                # Frontend environment (PRESERVE)
├── package.json                        # Dependencies (PRESERVE)
├── public/                             # Static assets (PRESERVE)
└── src/
    ├── index.js                        # Entry point (PRESERVE)
    ├── App.js                          # Main app component (PRESERVE)
    ├── App.css                         # Main styles (PRESERVE)
    ├── context/
    │   └── AuthContext.js              # Auth context (PRESERVE)
    ├── components/                     # Reusable components (PRESERVE ALL)
    ├── pages/                          # 28+ page components (PRESERVE ALL)
    │   ├── Homepage.js/.css
    │   ├── Login.js/.css
    │   ├── Register.js/.css
    │   ├── Dashboard.js/.css
    │   ├── Profile.js/.css
    │   ├── AddFarm.js/.css
    │   ├── FarmList.js/.css
    │   ├── BatchManagement.js/.css
    │   ├── TreatmentManagement.js/.css
    │   ├── VaccinationManagement.js/.css
    │   ├── AMURecords.js/.css
    │   ├── QRGenerator.js/.css
    │   ├── QRVerification.js/.css
    │   ├── VetDashboard.js/.css
    │   ├── VetPrescription.js/.css
    │   ├── VetTreatmentRecording.js/.css
    │   ├── VetWithdrawalAlerts.js/.css
    │   ├── CreatePrescription.js/.css
    │   ├── ProcessorPortal.js/.css
    │   ├── AuthorityDashboard.js/.css
    │   ├── AuthorityAnalytics.js/.css
    │   ├── GeographicHeatmap.js/.css
    │   ├── IndiaAMUMap.js/.css
    │   ├── ComplianceAlerts.js/.css
    │   ├── WithdrawalAlerts.js/.css
    │   ├── FarmerNotifications.js/.css
    │   ├── AuthCallback.js
    │   └── RoleSelection.js/.css
    └── services/                       # API services (PRESERVE)
```

---

## 🗄️ DATABASE SCHEMA

### Core Tables (Original)
1. **users** - User accounts with roles (farmer, veterinarian, processor, authority)
2. **farmers** - Farmer profile details (phone, address, state, district)
3. **farms** - Farm information with GPS coordinates
4. **batches** - Animal batch tracking
5. **entities** - Individual animals or batch groups
6. **treatments** - Medical treatment records
7. **vaccinations** - Vaccination records
8. **amu_records** - Antimicrobial usage tracking
9. **notifications** - User notifications

### Enhanced Tables (from s2.sql/r2.sql)
10. **drug_master** - WHO drug reference with criticality
11. **mrl_reference** - Maximum Residue Limits (Codex/FSSAI)
12. **prescriptions** - E-prescription management
13. **withdrawal_tracking** - Withdrawal period enforcement
14. **compliance_alerts** - Violation tracking
15. **blockchain_log** - Immutable audit trails (SHA256)
16. **processor_accounts** - Processor user accounts
17. **batch_verification** - QR batch verification
18. **authority_accounts** - Authority user accounts
19. **inspection_reports** - Audit documentation
20. **notification_queue** - Multi-channel alerts
21. **farm_amu_metrics** - AMU analytics
22. **heatmap_data** - Geographic risk mapping

---

## 🔑 KEY FEATURES IMPLEMENTED

### Authentication & Authorization
✅ JWT-based authentication
✅ Local email/password login
✅ Google OAuth integration (configured)
✅ Role-based access control (4 roles)
✅ Protected routes with middleware

### User Roles & Capabilities

**Farmer:**
- Manage farms and animals
- Record treatments and vaccinations
- Track withdrawal periods
- Generate QR codes
- View notifications and alerts
- Check compliance status

**Veterinarian:**
- Create e-prescriptions
- Search drugs and view MRL data
- Get safer drug alternatives
- Record treatments
- View assigned farms
- Monitor withdrawal alerts

**Processor:**
- Scan QR codes for batch verification
- Accept/Reject/Hold batches
- View compliance status
- Track daily statistics
- Verify withdrawal compliance

**Authority:**
- View all farms and records
- Approve/Reject prescriptions
- Access analytics and reports
- Monitor compliance rates
- View geographic heatmaps
- Inspect audit trails

### Farm Management
✅ Add farms with GPS coordinates
✅ Google Maps integration
✅ Farm listing and details
✅ Multi-farm support per farmer

### Animal/Batch Tracking
✅ Create and manage batches
✅ Individual animal tracking
✅ Species tracking (cattle, poultry, buffalo, goat)
✅ Batch status management

### Treatment & Medication
✅ Record treatments with drug details
✅ Drug search and autocomplete
✅ WHO criticality classification
✅ MRL value display
✅ Safer alternative suggestions
✅ Dosage tracking
✅ Treatment history

### Withdrawal Period Management
✅ Automatic safe date calculation
✅ Withdrawal period tracking
✅ Compliance checking before sale
✅ Alert notifications (3 days before, at safe date)
✅ Prevent premature sale

### QR Code System
✅ Generate QR codes for batches
✅ QR code scanning (camera + manual)
✅ Batch verification workflow
✅ Drug package verification
✅ Expiry date validation

### MRL Compliance
✅ Species-specific MRL values
✅ Matrix-specific limits (milk, meat, egg, honey)
✅ Codex & FSSAI standards
✅ Compliance scoring
✅ Risk level classification

### Prescription Management
✅ E-prescription creation
✅ Draft → Pending → Approved workflow
✅ Authority approval system
✅ Rejection with reasons
✅ Prescription history

### Analytics & Reporting
✅ AMU usage trends
✅ Geographic heatmaps
✅ Risk analysis by farm
✅ Compliance rate metrics
✅ Critical drug tracking
✅ MRL violation reports
✅ Processor statistics
✅ WOAH export format

### Notifications
✅ In-app notifications
✅ Withdrawal alerts
✅ Compliance alerts
✅ Safe date reminders
✅ Multi-channel support (SMS, Email, WhatsApp - stubs)

### Audit & Compliance
✅ Blockchain audit trails (SHA256)
✅ Tamper detection
✅ Compliance scoring
✅ Alert generation
✅ Inspection reports

---

## 🔧 BACKEND API ENDPOINTS

### Authentication Routes (`/api/auth`)
- POST `/register` - User registration
- POST `/login` - Local login
- GET `/google` - Google OAuth start
- GET `/google/callback` - Google OAuth callback
- GET `/me` - Get current user
- PUT `/profile` - Update profile
- POST `/logout` - Logout

### Farm Routes (`/api/farms`)
- GET `/` - List farms
- GET `/:id` - Get farm details
- POST `/` - Create farm
- PUT `/:id` - Update farm
- DELETE `/:id` - Delete farm

### Batch Routes (`/api/batches`)
- GET `/` - List batches
- GET `/:id` - Get batch details
- POST `/` - Create batch
- PUT `/:id` - Update batch
- DELETE `/:id` - Delete batch

### Entity Routes (`/api/entities`)
- GET `/` - List entities (animals)
- GET `/:id` - Get entity details
- POST `/` - Create entity
- PUT `/:id` - Update entity
- DELETE `/:id` - Delete entity

### Treatment Routes (`/api/treatments`)
- GET `/` - List treatments
- GET `/:id` - Get treatment details
- POST `/` - Record treatment
- PUT `/:id` - Update treatment
- DELETE `/:id` - Delete treatment

### Vaccination Routes (`/api/vaccinations`)
- GET `/` - List vaccinations
- GET `/:id` - Get vaccination details
- POST `/` - Record vaccination
- PUT `/:id` - Update vaccination
- DELETE `/:id` - Delete vaccination

### Prescription Routes (`/api/prescriptions`)
- GET `/` - List prescriptions (role-filtered)
- GET `/:id` - Get prescription details
- POST `/` - Create prescription (vet only)
- PUT `/:id` - Update prescription
- PUT `/:id/submit` - Submit for approval
- PUT `/:id/approve` - Approve (authority only)
- PUT `/:id/reject` - Reject with reason

### Drug Routes (`/api/drugs`)
- GET `/search` - Search drugs
- GET `/` - List all drugs
- GET `/:id` - Get drug details with MRL
- GET `/:id/mrl` - Get MRL for species/matrix
- GET `/:id/alternatives` - Get safer alternatives
- POST `/verify-qr` - Verify drug QR code
- GET `/critical/list` - List WHO critical drugs
- GET `/banned/list` - List banned drugs

### Withdrawal Routes (`/api/withdrawals`)
- GET `/` - List withdrawal records
- GET `/:id` - Get withdrawal details
- POST `/` - Record treatment (creates withdrawal)
- POST `/:id/sale` - Mark safe for sale
- POST `/:id/hold` - Quarantine product
- POST `/:id/check-compliance` - Verify safe date

### Verification Routes (`/api/batches/verification`)
- GET `/pending-verification` - Get pending batches
- POST `/verify-qr` - Scan & verify QR code
- POST `/:id/accept` - Accept batch
- POST `/:id/reject` - Reject batch
- POST `/:id/hold` - Hold for testing
- GET `/stats/today` - Daily statistics

### Analytics Routes (`/api/analytics`)
- GET `/amu-trends` - AMU usage trends
- GET `/heatmap` - Risk heatmap data
- GET `/risk-analysis` - Risk scores
- GET `/woah-export` - WOAH-formatted export
- GET `/compliance-rates` - Compliance metrics
- GET `/critical-drugs` - Critical drug tracking
- GET `/mrl-violations` - MRL breach analytics
- GET `/withdrawal-alerts` - Pending withdrawals
- GET `/processor-stats` - Batch verification metrics

### AMU Routes (`/api/amu`)
- GET `/records` - AMU records
- POST `/record` - Create AMU record
- GET `/statistics` - AMU statistics

### QR Routes (`/api/qr`)
- POST `/generate` - Generate QR code
- POST `/verify` - Verify QR code

### Notification Routes (`/api/notifications`)
- GET `/` - Get user notifications
- PUT `/:id/read` - Mark as read
- GET `/unread-count` - Get unread count

---

## 📦 DEPENDENCIES

### Backend Dependencies
```json
{
  "@google/generative-ai": "^0.21.0",
  "bcrypt": "^5.1.1",
  "body-parser": "^1.20.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "express-session": "^1.17.3",
  "jsonwebtoken": "^9.0.2",
  "mysql2": "^3.15.3",
  "passport": "^0.7.0",
  "passport-google-oauth20": "^2.0.0",
  "passport-local": "^1.0.0",
  "qrcode": "^1.5.3"
}
```

### Frontend Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "axios": "^1.6.2",
  "recharts": "^2.10.3"
}
```

---

## 🔐 ENVIRONMENT VARIABLES

### Backend .env (Required)
```env
# Database
DB_HOST=your_railway_mysql_host
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=your_database
DB_PORT=3306

# JWT
JWT_SECRET=your_jwt_secret

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Optional - Notification Services
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
MSG91_API_KEY=your_msg91_key
SENDGRID_API_KEY=your_sendgrid_key
```

### Frontend .env (Optional)
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_GOOGLE_MAPS_API_KEY=your_maps_key
```

---

## 🚀 HOW TO RUN

### Prerequisites
- Node.js v16+
- MySQL v8.0+
- npm or yarn

### Setup Steps
1. **Install Dependencies:**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

2. **Configure Environment:**
   - Copy `.env.example` to `.env` in both backend and frontend
   - Fill in database credentials and API keys

3. **Setup Database:**
   ```bash
   # Create database
   mysql -u root -p
   CREATE DATABASE sih;

   # Import schema
   SOURCE path/to/sih_data.sql;
   # or
   SOURCE path/to/s2.sql;
   ```

4. **Start Servers:**
   ```bash
   # Backend (Terminal 1)
   cd backend
   npm start
   # Runs on http://localhost:5000

   # Frontend (Terminal 2)
   cd frontend
   npm start
   # Runs on http://localhost:3000
   ```

5. **Access Application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

---

## 🧪 TEST CREDENTIALS

### Local Login (Email/Password)
- **Farmer:** farmer@test.com / farmer123
- **Veterinarian:** vet@test.com / vet123
- **Processor:** processor@test.com / processor123
- **Authority:** authority@test.com / authority123

---

## 📝 KNOWN ISSUES & STATUS

### Working Features
✅ Backend server running
✅ Frontend React app running
✅ Database connection
✅ Local email/password authentication
✅ All CRUD operations
✅ Role-based access control
✅ Most API endpoints functional

### Issues Encountered (from conversation history)
⚠️ Google OAuth was failing - Fixed with local auth alternative
⚠️ Some profile creation issues for different roles - Fixed
⚠️ Database schema updates needed - s2.sql and sih_data.sql available

### Pending Tasks
- Apply latest database migrations (s2.sql or sih_data.sql)
- Load MRL JSON data into database
- Test all user roles thoroughly
- Fix any remaining Google OAuth issues (optional)
- Deploy to production

---

## 🗂️ FILES TO DELETE (AI-Generated Documentation)

### Root Directory Documentation (DELETE)
- AUTHENTICATION_GUIDE.md
- DEPLOYMENT_READY.md
- FINAL_SUMMARY.md
- IMPLEMENTATION_SUMMARY.md
- LOGIN_SOLUTION.md
- LOGIN_VISUAL_GUIDE.md
- QUICKSTART.md
- QUICKSTART_LOGIN.md
- QUICK_REFERENCE.md
- S2_MIGRATION_GUIDE.md
- SETUP.md
- SYSTEM_STATUS.md
- TEAM-GUIDE.md
- TESTING_GUIDE.md
- UI_UX_ENHANCEMENTS.md

### Backend Test/Utility Scripts (DELETE)
- check_schema.js
- check_tables.js
- create_missing_tables.js
- create_roles.js
- create_test_users.js
- exec_s2_migration.js
- extract.js
- extract_medicines.js
- fix_authority_data.js
- fix_database.js
- fix_database_v2.js
- fix_profiles.js
- init_db.js
- insert_users.js
- migrate_s2.js
- migrate_s2.py
- migrate_s2_async.js
- migrate_s2_simple.js
- populate_notifications.js
- run_s2_migration.js
- seed_farmer_data.js
- setup_db.js
- setup_test_users.js
- test-chatbot.js
- test-entity.js
- test-gemini.js
- test-treatment.js
- test-verify.js
- test_login.js
- test_overdosage.js
- test_register.js
- updateMrlJson.js
- update_constraint.js
- verify_migration.js

### Migration/Log Files (DELETE)
- migrate_s2.js
- migration.log
- migration_error.log
- run_migration.bat

---

## 📌 FILES TO PRESERVE

### Critical Files (DO NOT DELETE)
✅ All files in `backend/models/` (16 files)
✅ All files in `backend/routes/` (21 files)
✅ All files in `backend/config/`
✅ All files in `backend/middleware/`
✅ All files in `backend/services/`
✅ All files in `frontend/src/` (all .js and .css files)
✅ backend/.env
✅ frontend/.env
✅ backend/package.json
✅ frontend/package.json
✅ backend/server.js
✅ frontend/src/index.js
✅ frontend/src/App.js
✅ .gitignore
✅ README.md (original)
✅ MRL_dataset.xlsx
✅ updated_mrl_per_species_matrix_refined2.json
✅ s2.sql
✅ sih_data.sql
✅ r2.sql

---

## 📊 PROJECT STATISTICS

- **Total Backend Models:** 16
- **Total Backend Routes:** 21 route files
- **Total Frontend Pages:** 28+ pages
- **Total API Endpoints:** 80+
- **Database Tables:** 22+
- **Lines of Code:** ~15,000+
- **User Roles:** 4 (Farmer, Vet, Processor, Authority)

---

## 🎯 PROJECT GOALS & ACHIEVEMENTS

### Smart India Hackathon 2025 Objectives
✅ Digital farm management system
✅ AMU/MRL monitoring and compliance
✅ Multi-stakeholder platform
✅ QR-based traceability
✅ Regulatory compliance (WHO, FSSAI, Codex)
✅ Analytics and reporting
✅ Mobile-responsive design

### Technical Achievements
✅ Full-stack MERN-like application
✅ RESTful API architecture
✅ JWT authentication
✅ Role-based authorization
✅ Database normalization
✅ Responsive UI/UX
✅ Real-time notifications (framework ready)
✅ Blockchain audit trails (SHA256)
✅ Geographic visualization
✅ Compliance scoring algorithms

---

## 📞 SUPPORT & DOCUMENTATION

### For Development
- Backend runs on port 5000 (or 5001 fallback)
- Frontend runs on port 3000 (or 3001)
- Database: MySQL on Railway
- All API endpoints require JWT token in Authorization header

### For Deployment
- Ensure all environment variables are configured
- Run database migrations
- Build frontend for production: `npm run build`
- Use process manager (PM2) for backend
- Configure reverse proxy (Nginx) for production

---

## 🔄 GIT STATUS

### Last Commits (from git log)
```
15dde28 (HEAD -> main, origin/main) u updateing the errors
3f9b9ad up
76791f7 up
```

### Modified Files (not committed)
- frontend/src/pages/VetWithdrawalAlerts.css

---

## ✅ CONCLUSION

This project is a **comprehensive digital farm management system** with sophisticated features for tracking antimicrobial usage and ensuring food safety compliance. The system is **largely functional** with working authentication, database connectivity, and most features implemented.

**Current State:** Ready for testing and deployment with minor cleanup needed.

**Next Steps:**
1. Apply latest database migrations
2. Test all user workflows
3. Fix any remaining bugs
4. Deploy to production environment

---

**Document Created By:** Google Antigravity AI Assistant  
**Date:** November 27, 2025  
**Purpose:** Project state preservation before cleanup  
**Status:** Complete and ready for archival
