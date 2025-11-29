const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const passport = require("passport");

const { User, Farmer, Veterinarian } = require("../models/User");
const { authMiddleware } = require("../middleware/auth");

// ======================================================
// LOCAL REGISTER
// ======================================================
router.post("/register", async (req, res) => {
  try {
    const { email, password, full_name, role, phone, address, state, district } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    const userId = await User.create({
      email,
      password,
      display_name: full_name,
      role: role || "farmer"
    });

    if (role === "farmer" || !role) {
      await Farmer.create({
        user_id: userId,
        phone,
        address,
        state,
        district
      });
    } else if (role === "veterinarian") {
      await Veterinarian.create({
        user_id: userId,
        vet_name: full_name, // Use full_name as vet_name initially
        license_number: null, // To be updated later
        phone,
        state,
        district
      });
    }

    const token = jwt.sign(
      { user_id: userId, email, role: role || "farmer" },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ======================================================
// LOCAL LOGIN
// ======================================================
router.post("/login", (req, res, next) => {
  passport.authenticate("local", { session: false }, async (err, user, info) => {
    if (err) return res.status(500).json({ error: "Auth error" });
    if (!user) return res.status(401).json({ error: info.message || "Invalid credentials" });

    try {
      const userData = user.role === "farmer"
        ? await User.getUserWithFarmerDetails(user.user_id)
        : user.role === "veterinarian"
        ? await User.getUserWithVeterinarianDetails(user.user_id)
        : user;

      const token = jwt.sign(
        {
          user_id: user.user_id,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        message: "Login successful",
        token,
        user: userData
      });

    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  })(req, res, next);
});

// ======================================================
// GOOGLE LOGIN START — /api/auth/google
// ======================================================
router.get(
  "/google",
  (req, res, next) => {
    const role = req.query.role || 'farmer';
    passport.authenticate("google", {
      scope: ["profile", "email"],
      state: role
    })(req, res, next);
  }
);

// ======================================================
// GOOGLE CALLBACK — /api/auth/google/callback
// ======================================================
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: process.env.FRONTEND_URL + "/login?error=google_failed"
  }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(process.env.FRONTEND_URL + "/login?error=no_user");
      }

      // For new Google users (role is 'farmer' by default), update to selected role
      const selectedRole = req.query.state || 'farmer';
      if (req.user.role === 'farmer' && selectedRole !== 'farmer') {
        await User.update(req.user.user_id, { role: selectedRole });
        // Reload user with updated role
        req.user = await User.findById(req.user.user_id);
      }

      const token = jwt.sign(
        {
          user_id: req.user.user_id,
          email: req.user.email,
          role: req.user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Redirect to frontend with the generated JWT token
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/callback?token=${token}`
      );
    } catch (err) {
      console.error("Google callback error:", err);
      return res.redirect(process.env.FRONTEND_URL + "/login?error=callback_error");
    }
  }
);

// ======================================================
// GET CURRENT USER
// ======================================================
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = req.user.role === 'farmer'
      ? await User.getUserWithFarmerDetails(req.user.user_id)
      : req.user.role === 'veterinarian'
      ? await User.getUserWithVeterinarianDetails(req.user.user_id)
      : await User.findById(req.user.user_id);
    res.json(user);
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ======================================================
// UPDATE PROFILE
// ======================================================
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { full_name, phone, address, state, district, role, vet_name, license_number, taluk } = req.body;

    // Ensure user has a role
    let userRole = role || req.user.role || 'farmer';
    if (!req.user.role) {
      await User.update(req.user.user_id, { role: userRole });
      req.user.role = userRole;
    }

    await User.update(req.user.user_id, {
      display_name: full_name,
      role: userRole
    });

    // If farmer details provided, create/update farmer record
    if (role === 'farmer' || req.user.role === 'farmer') {
      const farmer = await Farmer.getByUserId(req.user.user_id);

      if (farmer) {
        await Farmer.update(req.user.user_id, {
          phone: phone || null,
          address: address || null,
          state: state || null,
          district: district || null,
          taluk: taluk || null
        });
      } else {
        await Farmer.create({
          user_id: req.user.user_id,
          phone: phone || null,
          address: address || null,
          state: state || null,
          district: district || null,
          taluk: taluk || null
        });
      }
    }

    // If veterinarian details provided, create/update veterinarian record
    if (role === 'veterinarian' || req.user.role === 'veterinarian') {
      const veterinarian = await Veterinarian.getByUserId(req.user.user_id);

      if (veterinarian) {
        await Veterinarian.update(req.user.user_id, {
          vet_name: vet_name || null,
          license_number: license_number || null,
          phone: phone || null,
          state: state || null,
          district: district || null,
          taluk: taluk || null
        });
      } else {
        await Veterinarian.create({
          user_id: req.user.user_id,
          vet_name: vet_name || null,
          license_number: license_number || null,
          phone: phone || null,
          state: state || null,
          district: district || null,
          taluk: taluk || null
        });
      }
    }

    const updated = req.user.role === 'farmer' || role === 'farmer'
      ? await User.getUserWithFarmerDetails(req.user.user_id)
      : req.user.role === 'veterinarian' || role === 'veterinarian'
      ? await User.getUserWithVeterinarianDetails(req.user.user_id)
      : await User.findById(req.user.user_id);

    res.json(updated);

  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Profile update failed" });
  }
});

// ======================================================
// LOGOUT
// ======================================================
router.post("/logout", authMiddleware, (req, res) => {
  res.json({ message: "Logged out" });
});

console.log('authRoutes router type:', typeof router);
module.exports = router;
