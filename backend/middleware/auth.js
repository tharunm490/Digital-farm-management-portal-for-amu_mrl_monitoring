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

// Generic role middleware - accepts an array of allowed roles
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. This resource is only for: ${allowedRoles.join(', ')}.` 
      });
    }
    next();
  };
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

const distributorOnly = (req, res, next) => {
  if (req.user.role !== 'distributor') {
    return res.status(403).json({ error: 'Access denied. Distributors only.' });
  }
  next();
};

module.exports = { authMiddleware, roleMiddleware, farmerOnly, authorityOnly, veterinarianOnly, distributorOnly };
