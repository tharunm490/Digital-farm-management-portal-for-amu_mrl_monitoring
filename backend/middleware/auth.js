const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

const farmerOnly = (req, res, next) => {
  if (req.user.role !== 'farmer') {
    return res.status(403).json({ error: 'Access denied. Farmers only.' });
  }
  next();
};

const authorityOnly = (req, res, next) => {
  if (req.user.role !== 'authority') {
    return res.status(403).json({ error: 'Access denied. Authorities only.' });
  }
  next();
};

const veterinarianOnly = (req, res, next) => {
  if (req.user.role !== 'veterinarian') {
    return res.status(403).json({ error: 'Access denied. Veterinarians only.' });
  }
  next();
};

module.exports = { authMiddleware, farmerOnly, authorityOnly, veterinarianOnly };
