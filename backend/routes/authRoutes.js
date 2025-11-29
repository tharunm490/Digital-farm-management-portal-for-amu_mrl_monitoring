const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const passport = require("passport");

const { User, Farmer } = require("../models/User");
const Veterinarian = require("../models/Veterinarian");
const { authMiddleware } = require("../middleware/auth");

// ======================================================
// LOCAL REGISTER
// ======================================================
router.post("/register", async (req, res) => {
  try {
    const { email, password, full_name, role, phone, address, state, district, license_number } = req.body;

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
        license_number,
        phone,
        state,
        district
      });
    }

    const token = jwt.sign(
      { user_id: userId, email, role: role || "farmer", display_name: full_name },
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
      let userData = user;
      if (user.role === "farmer") {
        userData = await User.getUserWithFarmerDetails(user.user_id);
      } else if (user.role === "veterinarian") {
        userData = await User.getUserWithVeterinarianDetails(user.user_id);
      }

      const token = jwt.sign(
        {
          user_id: user.user_id,
          email: user.email,
          role: user.role,
          display_name: user.display_name
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
  passport.authenticate("google", {
    scope: ["profile", "email"]
  })
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

    if (!req.user) {
      return res.redirect(process.env.FRONTEND_URL + "/login?error=no_user");
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
  }
);

// ======================================================
// GET CURRENT USER
// ======================================================
router.get("/me", authMiddleware, async (req, res) => {
  try {
    let user;
    if (req.user.role === 'farmer') {
      user = await User.getUserWithFarmerDetails(req.user.user_id);
    } else if (req.user.role === 'veterinarian') {
      user = await User.getUserWithVeterinarianDetails(req.user.user_id);
    } else {
      user = await User.findById(req.user.user_id);
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

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
    const { full_name, phone, address, state, district, license_number } = req.body;

    await User.update(req.user.user_id, {
      display_name: full_name
    });

    if (req.user.role === "farmer") {
      const farmer = await Farmer.getByUserId(req.user.user_id);

      if (farmer) {
        await Farmer.update(req.user.user_id, {
          phone,
          address,
          state,
          district
        });
      } else {
        await Farmer.create({
          user_id: req.user.user_id,
          phone,
          address,
          state,
          district
        });
      }
    } else if (req.user.role === "veterinarian") {
      const vet = await Veterinarian.getByUserId(req.user.user_id);

      if (vet) {
        await Veterinarian.update(req.user.user_id, {
          phone,
          state,
          district,
          license_number
        });
      } else {
        await Veterinarian.create({
          user_id: req.user.user_id,
          phone,
          state,
          district,
          license_number
        });
      }
    }

    // Fetch updated user data
    let updated;
    if (req.user.role === 'farmer') {
      updated = await User.getUserWithFarmerDetails(req.user.user_id);
    } else if (req.user.role === 'veterinarian') {
      updated = await User.getUserWithVeterinarianDetails(req.user.user_id);
    } else {
      updated = await User.findById(req.user.user_id);
    }

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

module.exports = router;
