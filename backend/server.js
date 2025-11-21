// =========================================
// LOAD ENV VARIABLES
// =========================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');

const app = express();
const PORT = process.env.PORT || 5000;

// =========================================
// HEALTH CHECK (USED BY MOBILE / NGROK / CLOUDFLARE)
// =========================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// =========================================
// ALLOWED CORS ORIGINS
// =========================================
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  process.env.QR_FRONTEND_URL,
  'http://localhost:5000'  // Add localhost:5000 as allowed origin
].filter(Boolean);

// If there is a hotspot IP (10.x.x.x) detected, add it to allowedOrigins dynamically
const { getHotspotIp } = require('./utils/network');
const hotspotIp = getHotspotIp();
if (hotspotIp) {
  const hotspotOrigin = `http://${hotspotIp}:3000`;
  if (!allowedOrigins.includes(hotspotOrigin)) allowedOrigins.push(hotspotOrigin);
}

// =========================================
// SPECIAL CORS RULES FOR QR + VERIFY (PUBLIC ACCESS)
// =========================================
app.use((req, res, next) => {
  if (req.path.startsWith('/api/verify') || req.path.startsWith('/api/qr')) {
    return cors({ origin: "*" })(req, res, next);
  }
  next();
});

// =========================================
// STANDARD CORS FOR REST API
// =========================================
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow mobile, curl, postman
    if (allowedOrigins.includes(origin)) return callback(null, true);

    console.log("❌ BLOCKED ORIGIN:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

// =========================================
// BODY PARSERS
// =========================================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// =========================================
// SESSION (REQUIRED FOR PASSPORT GOOGLE LOGIN)
// =========================================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret123",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 86400000 } // 1 day
  })
);

// =========================================
// PASSPORT CONFIG
// =========================================
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

// =========================================
// ✔ ONLY ONE AUTH ROUTE (NO DUPLICATES)
// Google OAuth & Local Auth both inside authRoutes.js
// =========================================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/farms', require('./routes/farmRoutes'));
app.use('/api/entities', require('./routes/entityRoutes'));
app.use('/api/treatments', require('./routes/treatmentRoutes'));
app.use('/api/vaccinations', require('./routes/vaccinationRoutes'));
app.use('/api/batches', require('./routes/batchRoutes'));
app.use('/api/amu', require('./routes/amuRoutes'));
app.use('/api/qr', require('./routes/qrRoutes'));
app.use('/api/verify', require('./routes/verifyRoutes'));
app.use('/api/chatbot', require('./routes/chatbotRoutes'));

// =========================================
// API HEALTH ENDPOINT
// =========================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'FarmTrack API is running' });
});

// =========================================
// – GLOBAL ERROR HANDLER
// =========================================
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);
  res.status(500).json({ error: "Something went wrong!" });
});

// =========================================
// START SERVER
// =========================================
const os = require('os');

function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`➡ Local: http://localhost:${PORT}`);
  console.log(`➡ Network: http://${localIp}:${PORT}`);
});
