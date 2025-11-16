require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Initialize passport config
require('./config/passport')(passport);

// Import routes
const authRoutes = require('./routes/authRoutes');
const farmRoutes = require('./routes/farmRoutes');
const entityRoutes = require('./routes/entityRoutes');
const treatmentRoutes = require('./routes/treatmentRoutes');
const batchRoutes = require('./routes/batchRoutes'); // Legacy - can be removed later
const amuRoutes = require('./routes/amuRoutes');
const qrRoutes = require('./routes/qrRoutes');
const verifyRoutes = require('./routes/verifyRoutes');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/treatments', treatmentRoutes);
app.use('/api/batches', batchRoutes); // Legacy - can be removed later
app.use('/api/amu', amuRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/verify', verifyRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Farm Management API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network (Wi-Fi): http://10.16.11.95:${PORT}`);
  console.log(`Use http://10.16.11.95:${PORT} on your mobile device`);
});
