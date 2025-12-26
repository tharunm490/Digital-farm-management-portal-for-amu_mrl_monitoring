# Copilot Instructions - Digital Farm Management Portal

## Project Overview

**FarmTrack** is a digital farm management system for AMU/MRL monitoring with multi-stakeholder support (Farmers, Veterinarians, Authorities, Processors). The system uses role-based access control, real-time treatment tracking, and compliance monitoring for livestock management.

**Tech Stack:** Node.js/Express + React 18 + MySQL  
**Key Features:** QR-based verification, Google OAuth, Withdrawal period calculations, Geographic analytics

---

## Architecture Patterns

### Multi-Role Backend Design
The system supports four primary roles via JWT middleware:

- **farmer**: Own farms only, record treatments, view QR codes
- **veterinarian**: Assigned farms only (via VetFarmMapping model), approve prescriptions, create e-prescriptions
- **authority**: All data access, geographic filtering (state/district/taluk)
- **processor**: QR-based verification (limited scope)

**Key Pattern:** Role-checking is done via middleware in routes (`authMiddleware`, `farmerOnly`, `veterinarianOnly`, `authorityOnly`). Check `/backend/middleware/auth.js` for implementations.

### Database-Driven Role Filtering
Queries actively filter by role context. Example from `farmRoutes.js`:
- Farmers get `WHERE farmer_id = ?` (their farms)
- Vets get joined through VetFarmMapping
- Authorities get aggregated counts with full data

This is **not** a frontend-only security layer—enforce at database query level.

### Authentication Flow
1. **Register**: POST `/api/auth/register` with email/password (creates User + role-specific records)
2. **Login**: POST `/api/auth/login` returns JWT token (24h expiry)
3. **Google OAuth**: `/api/auth/google/callback` (Passport integration)
4. **Token Validation**: All protected routes require `Authorization: Bearer <token>` header

LocalStorage stores token in frontend; axios client auto-adds header in `src/services/`.

---

## Critical Data Models

### Core Entities (in `/backend/models/`)

- **Farm.js**: `farms` table—contains farm_id, farm_name, lat/long, farmer_id FK
- **Entity.js**: `animals_or_batches` table—livestock tracking (species, count, purchase_date)
- **Treatment.js**: `treatment_records`—drug details, dosage, withdrawal_period (calculated field)
- **Veterinarian.js**: `veterinarians` table—licensed vets, state/district assignment
- **VetFarmMapping.js**: `vet_farm_mapping`—links vets to farms based on geography
- **MRL.js**: `mrl_table`—drug residue limits (species/drug pairs), loaded from `updated_mrl_per_species_matrix_refined2.json`
- **AMU.js**: `amu_records`—antimicrobial usage logs (auto-created when treatments recorded)

**Database Name:** Hardcoded to `SIH` in `/backend/config/database.js` (not parsed from environment).

### Key Relationships
```
User (1) --> (M) Farmer (1) --> (M) Farms (1) --> (M) Entities/Batches
                                       |
                                       v
                            (via VetFarmMapping)
                                   Veterinarian

Treatment --> Entity, Drug --> MRL compliance check
```

---

## Critical Workflows

### Adding a Treatment
1. Farmer: POST `/api/treatments/record` with entity_id, drug_name, dosage, admin_route
2. Backend: Treatment.js creates record, auto-calculates `withdrawal_period` based on drug + species
3. Backend: AMU.js auto-creates corresponding AMU log
4. Compliance: MRL model checks if residue safe by withdrawal_date

**Key Files:** `treatmentRoutes.js` (POST handler), `Treatment.js` (calc logic), `MRL.js` (safety check)

### Veterinarian Prescription Flow
1. **Create**: Vet POST `/api/prescriptions` with farm_id, entity_id, drugs array
2. **Submit**: Vet clicks submit → status becomes "approved" immediately (no authority needed)
3. **View**: Farmer sees approved prescription in their dashboard
4. **Override**: Authority can still approve if oversight is needed

**Key Point:** Prescriptions skip authority approval now (workflow changed from original design).

### Geographic Filtering (Authority Dashboard)
- Select State → database filters `WHERE state = ?`
- Select District → narrows to `WHERE state = ? AND district = ?`
- Select Taluk → further narrows to `WHERE state = ? AND district = ? AND taluk = ?`
- All stored in Farmer table; farms join through farmer_id

---

## Development Commands

```powershell
# First time setup (requires Node 16+, MySQL 8.0+)
cd backend
npm install
cd ../frontend
npm install

# Running locally
cd backend; npm run dev        # Auto-reload on file changes (port 5000)
cd frontend; npm start          # Dev server with HMR (port 3000)

# Testing
# Backend: No test suite; use check_*.js scripts in /backend/scripts
# Frontend: npm test in /frontend

# Database
# Import schema: SOURCE path/to/s2.sql;
# Import data: SOURCE path/to/sih_data.sql;
```

---

## Common Code Patterns

### Backend API Endpoint
```javascript
router.post('/resource', authMiddleware, farmerOnly, async (req, res) => {
  try {
    // 1. Validate role (middleware already did this)
    // 2. Query database with role context
    const [rows] = await db.query('SELECT * FROM table WHERE owner_id = ?', [req.user.user_id]);
    
    // 3. Return standard response
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});
```

### Frontend Authentication Context
```javascript
// src/context/AuthContext.js provides useAuth() hook
const { user, login, logout } = useAuth();

// user object: { user_id, email, role, display_name }
// Pass role checks to ProtectedRoute component
```

### Protected Routes (Frontend)
```javascript
<Route element={<ProtectedRoute requiredRole="farmer" />}>
  <Route path="/farms" element={<FarmList />} />
</Route>
```

---

## File Organization Rules

- **Models** (`/backend/models/`): One model per entity; must export async functions for CRUD
- **Routes** (`/backend/routes/`): Route files use singular endpoint names (farmRoutes, not farmsRoutes)
- **Pages** (`/frontend/src/pages/`): One page per route; pair with .css file
- **Components** (`/frontend/src/components/`): Reusable UI elements (buttons, forms, cards)
- **Scripts** (`/backend/scripts/`): Debug/migration scripts (not part of API)

---

## Environment Variables Required

**Backend (.env):**
```
PORT=5000
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=<your_mysql_password>
DB_PORT=3306
JWT_SECRET=<any_secret_string>
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<oauth_id>
GOOGLE_CLIENT_SECRET=<oauth_secret>
```

**Frontend (.env):**
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_GOOGLE_MAPS_KEY=<maps_api_key>
```

**Note:** Do NOT commit .env files. Use `.env.example` template.

---

## Debugging Tips

- **Database Issues**: Run `backend/check_db.js` to inspect schema and test queries
- **Auth Failures**: Check JWT_SECRET matches between server and token (verify in `authMiddleware`)
- **Role Routing**: Ensure middleware matches route protection (e.g., `farmerOnly` on farmer endpoints)
- **Withdrawal Period**: Check `Treatment.js` calculateWithdrawalPeriod() logic if dates are wrong
- **CORS Errors**: Update `allowedOrigins` in `/backend/server.js` for new dev URLs

---

## When to Add New Endpoints

1. **Create model method** in `/backend/models/EntityName.js` (e.g., `Farm.getByFarmerId()`)
2. **Add route handler** in `/backend/routes/entityNameRoutes.js` with appropriate middleware
3. **Create frontend service** in `/frontend/src/services/` to call endpoint
4. **Add page or component** that uses the service
5. **Test with role context**: Verify farmers can't access vet endpoints, etc.

---

## Known Quirks

- **Database name is hardcoded**: `SIH` in config/database.js, not read from DB_NAME env var
- **Prescription approval changed**: Originally required authority approval; now vets auto-approve
- **Authority dashboard has new filters**: State/District/Taluk cascading filters (check `AuthorityDashboard.js`)
- **Veterinarian auto-assignment**: Creating a farm auto-assigns a vet based on farmer's state/district/taluk
- **No test suite**: Project uses ad-hoc check_*.js scripts instead of Jest/Mocha

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `/backend/server.js` | Express app setup, CORS, session config |
| `/backend/middleware/auth.js` | JWT verification and role middleware |
| `/backend/config/database.js` | MySQL pool configuration |
| `/backend/models/Farm.js`, `Treatment.js` | Core business logic |
| `/backend/routes/authRoutes.js` | User registration and JWT login |
| `/frontend/src/context/AuthContext.js` | React authentication state |
| `/frontend/src/App.js` | Route definitions and role-based navigation |
| `s2.sql` | Complete database schema (import first) |
| `.env` | Never commit; configure locally with credentials |
