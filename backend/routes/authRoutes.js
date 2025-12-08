const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const passport = require("passport");

const { User, Farmer, Veterinarian, Authority } = require("../models/User");
const { Distributor } = require("../models/Distributor");
// OTP temporarily disabled - will be added later for farmers
// const OTP = require("../models/OTP");
// const SMSService = require("../utils/smsService");
const { authMiddleware } = require("../middleware/auth");

// Simple CAPTCHA storage (in production, use Redis or database)
const captchaStore = new Map();

// ======================================================
// GENERATE CAPTCHA
// ======================================================
router.get("/captcha/generate", (req, res) => {
  try {
    // Generate a random 6-character alphanumeric CAPTCHA
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0,O,1,I
    let captchaText = '';
    for (let i = 0; i < 6; i++) {
      captchaText += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Generate a unique ID for this CAPTCHA
    const captchaId = `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store CAPTCHA with 5 minute expiry
    captchaStore.set(captchaId, {
      text: captchaText,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });
    
    // Clean up expired CAPTCHAs
    for (const [key, value] of captchaStore.entries()) {
      if (value.expires < Date.now()) {
        captchaStore.delete(key);
      }
    }
    
    console.log(`Generated CAPTCHA: ${captchaText} (ID: ${captchaId})`);
    
    res.json({
      captchaId,
      captchaText // In production, return an image instead of text
    });
  } catch (err) {
    console.error("CAPTCHA generation error:", err);
    res.status(500).json({ error: "Failed to generate CAPTCHA" });
  }
});

// ======================================================
// VERIFY CAPTCHA (internal helper)
// ======================================================
const verifyCaptcha = (captchaId, captchaInput) => {
  const stored = captchaStore.get(captchaId);
  
  if (!stored) {
    return { valid: false, error: "CAPTCHA expired or invalid. Please refresh and try again." };
  }
  
  if (stored.expires < Date.now()) {
    captchaStore.delete(captchaId);
    return { valid: false, error: "CAPTCHA has expired. Please refresh and try again." };
  }
  
  if (stored.text.toUpperCase() !== captchaInput.toUpperCase()) {
    return { valid: false, error: "Invalid CAPTCHA. Please try again." };
  }
  
  // Delete used CAPTCHA
  captchaStore.delete(captchaId);
  return { valid: true };
};

// ======================================================
// FARMER REGISTRATION (Aadhaar + Phone + CAPTCHA)
// ======================================================
router.post("/farmer/register", async (req, res) => {
  try {
    const { display_name, aadhaar_number, phone, email, state, district, taluk } = req.body;

    // Validate required fields
    if (!display_name || !aadhaar_number || !phone || !state || !district) {
      return res.status(400).json({ 
        error: "Missing required fields. Name, Aadhaar, Phone, State, and District are required." 
      });
    }

    // Validate Aadhaar format (12 digits)
    if (!/^\d{12}$/.test(aadhaar_number)) {
      return res.status(400).json({ error: "Invalid Aadhaar number. Must be 12 digits." });
    }

    // Validate phone format (10 digits)
    const cleanPhone = phone.replace(/[\s\-+]/g, '').slice(-10);
    if (!/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Invalid phone number. Must be 10 digits." });
    }

    // Check if Aadhaar is already used
    const existingUser = await User.isAadhaarUsed(aadhaar_number);
    if (existingUser) {
      return res.status(400).json({ 
        error: `This Aadhaar is already registered as ${existingUser.role}. Each Aadhaar can only be used once.` 
      });
    }

    // Create user in users table
    const userId = await User.createFarmer({
      display_name,
      aadhaar_number,
      phone: cleanPhone,
      email,
      state,
      district,
      taluk
    });

    // Create farmer profile
    await Farmer.create({
      user_id: userId,
      address: null
    });

    // OTP verification temporarily disabled
    // const otp = OTP.generateOTP();
    // await OTP.store(cleanPhone, aadhaar_number, otp);
    // await SMSService.sendOTP(cleanPhone, otp);

    res.status(201).json({
      message: "Registration successful! You can now login with your Aadhaar and Phone number.",
      user_id: userId,
      requiresOTP: false
    });

  } catch (err) {
    console.error("Farmer registration error:", err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Aadhaar number is already registered." });
    }
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// ======================================================
// FARMER SEND OTP (for login) - TEMPORARILY DISABLED
// Will be enabled later when SMS service is configured
// ======================================================
/*
router.post("/farmer/send-otp", async (req, res) => {
  try {
    const { aadhaar_number, phone } = req.body;

    // Validate inputs
    if (!aadhaar_number || !phone) {
      return res.status(400).json({ error: "Aadhaar number and phone are required." });
    }

    // Validate Aadhaar format
    if (!/^\d{12}$/.test(aadhaar_number)) {
      return res.status(400).json({ error: "Invalid Aadhaar number. Must be 12 digits." });
    }

    // Clean phone number
    const cleanPhone = phone.replace(/[\s\-+]/g, '').slice(-10);

    // Find farmer with matching Aadhaar + Phone
    const farmer = await User.findFarmerByAadhaarAndPhone(aadhaar_number, cleanPhone);
    
    if (!farmer) {
      // Check if Aadhaar exists with different phone
      const userWithAadhaar = await User.findByAadhaar(aadhaar_number);
      if (userWithAadhaar) {
        return res.status(400).json({ 
          error: "Phone number does not match the registered Aadhaar. Please use the registered phone number." 
        });
      }
      return res.status(404).json({ 
        error: "No farmer account found with this Aadhaar. Please register first." 
      });
    }

    // Generate and store OTP
    const otp = OTP.generateOTP();
    await OTP.store(cleanPhone, aadhaar_number, otp);

    // Send OTP via SMS
    const smsResult = await SMSService.sendOTP(cleanPhone, otp);
    
    if (smsResult.fallback) {
      console.log(`[DEV] OTP for ${cleanPhone}: ${otp}`);
    }

    res.json({ 
      message: "OTP sent successfully to your registered phone number.",
      expiresIn: "5 minutes"
    });

  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
});
*/

// ======================================================
// FARMER LOGIN WITH CAPTCHA (replaces OTP temporarily)
// ======================================================
router.post("/farmer/login", async (req, res) => {
  try {
    const { aadhaar_number, phone, captchaId, captchaInput } = req.body;

    // Validate inputs
    if (!aadhaar_number || !phone) {
      return res.status(400).json({ error: "Aadhaar number and phone are required." });
    }

    // Validate CAPTCHA
    if (!captchaId || !captchaInput) {
      return res.status(400).json({ error: "Please complete the CAPTCHA verification." });
    }
    
    const captchaResult = verifyCaptcha(captchaId, captchaInput);
    if (!captchaResult.valid) {
      return res.status(400).json({ error: captchaResult.error });
    }

    // Validate Aadhaar format
    if (!/^\d{12}$/.test(aadhaar_number)) {
      return res.status(400).json({ error: "Invalid Aadhaar number. Must be 12 digits." });
    }

    // Clean phone number
    const cleanPhone = phone.replace(/[\s\-+]/g, '').slice(-10);

    // Find farmer with matching Aadhaar + Phone
    const farmer = await User.findFarmerByAadhaarAndPhone(aadhaar_number, cleanPhone);
    
    if (!farmer) {
      // Check if Aadhaar exists with different phone
      const userWithAadhaar = await User.findByAadhaar(aadhaar_number);
      if (userWithAadhaar) {
        return res.status(400).json({ 
          error: "Phone number does not match the registered Aadhaar. Please use the registered phone number." 
        });
      }
      return res.status(404).json({ 
        error: "No farmer account found with this Aadhaar. Please register first." 
      });
    }

    // Get farmer details
    const farmerDetails = await User.getUserWithFarmerDetails(farmer.user_id);

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: farmer.user_id,
        aadhaar_number: farmer.aadhaar_number,
        role: 'farmer'
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: farmerDetails
    });

  } catch (err) {
    console.error("Farmer login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ======================================================
// FARMER VERIFY OTP (login) - TEMPORARILY DISABLED
// ======================================================
/*
router.post("/farmer/verify-otp", async (req, res) => {
  try {
    const { aadhaar_number, phone, otp } = req.body;

    // Validate inputs
    if (!aadhaar_number || !phone || !otp) {
      return res.status(400).json({ error: "Aadhaar, phone, and OTP are required." });
    }

    const cleanPhone = phone.replace(/[\s\-+]/g, '').slice(-10);

    // Verify OTP
    const verification = await OTP.verify(cleanPhone, aadhaar_number, otp);
    
    if (!verification.valid) {
      return res.status(400).json({ error: verification.error });
    }

    // Get farmer user
    const farmer = await User.findFarmerByAadhaarAndPhone(aadhaar_number, cleanPhone);
    if (!farmer) {
      return res.status(404).json({ error: "Farmer account not found." });
    }

    // Get farmer details
    const farmerDetails = await User.getUserWithFarmerDetails(farmer.user_id);

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: farmer.user_id,
        aadhaar_number: farmer.aadhaar_number,
        role: 'farmer'
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: farmerDetails
    });

  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "OTP verification failed. Please try again." });
  }
});
*/

// ======================================================
// GOOGLE LOGIN START — /api/auth/google
// For AUTHORITY, VETERINARIAN, and DISTRIBUTOR only
// ======================================================
router.get("/google", (req, res, next) => {
  const role = req.query.role;
  
  // BLOCK farmers from using Google login
  if (role === 'farmer') {
    return res.redirect(
      `${process.env.FRONTEND_URL}/login?error=farmers_use_otp&message=Farmers must use Aadhaar + OTP login`
    );
  }
  
  // Only allow authority, veterinarian, distributor and laboratory
  if (!['authority', 'veterinarian', 'distributor', 'laboratory'].includes(role)) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    console.warn(`Google login attempt with invalid role: ${role}`);
    return res.redirect(
      `${frontendUrl}/login?error=invalid_role&attempted_role=${encodeURIComponent(role || '')}&message=Invalid role selected`
    );
  }

  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: role
  })(req, res, next);
});

// ======================================================
// GOOGLE CALLBACK — /api/auth/google/callback
// ======================================================
router.get("/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: (process.env.FRONTEND_URL || "http://localhost:3000") + "/login?error=google_failed"
  }),
  async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    
    try {
      if (!req.user) {
        console.error("❌ No user in Google callback");
        return res.redirect(frontendUrl + "/login?error=no_user");
      }

      const selectedRole = req.query.state || req.user.intendedRole;
      console.log("✅ Google OAuth callback - Role:", selectedRole, "Email:", req.user.email);

      // Validate selectedRole to avoid uncaught errors later
      const allowedRoles = ['authority', 'veterinarian', 'distributor', 'laboratory'];
      if (!selectedRole || !allowedRoles.includes(selectedRole)) {
        console.warn(`Google callback received invalid or missing role: ${selectedRole}`);
        return res.redirect(
          `${frontendUrl}/login?error=invalid_role&attempted_role=${encodeURIComponent(selectedRole || '')}&message=Invalid role in callback`
        );
      }
      
      const existingUser = await User.findByGoogleUID(req.user.google_uid);

      // ================================================================
      // CRITICAL: ROLE LOCKING LOGIC
      // ================================================================
      if (existingUser) {
        // User already exists - check if role matches
        if (existingUser.role !== selectedRole) {
          // ROLE MISMATCH - DENY ACCESS
          return res.redirect(
            `${frontendUrl}/login?error=role_mismatch&registered_role=${existingUser.role}&attempted_role=${selectedRole}`
          );
        }
        
        // Role matches - proceed with login
        const token = jwt.sign(
          {
            user_id: existingUser.user_id,
            email: existingUser.email,
            role: existingUser.role
          },
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );

        return res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
      }

      // New user - create with selected role (role is now LOCKED)
      console.log(`Creating new user for role: ${selectedRole}, email: ${req.user.email}`);
      const userId = await User.createGoogleUser({
        google_uid: req.user.google_uid,
        email: req.user.email,
        display_name: req.user.display_name,
        role: selectedRole
      });
      console.log(`✅ User created with ID: ${userId}`);

      // Create role-specific profile
      try {
        if (selectedRole === 'veterinarian') {
          // Veterinarian needs to complete profile later
          console.log('Creating veterinarian profile...');
          await Veterinarian.create({
            user_id: userId,
            vet_name: req.user.display_name,
            license_number: `TEMP_${Date.now()}`, // Temporary, to be updated
            phone: null
          });
          console.log('✅ Veterinarian profile created');
        } else if (selectedRole === 'authority') {
          console.log('Creating authority profile...');
          await Authority.create({
            user_id: userId,
            department: null,
            designation: null,
            phone: null
          });
          console.log('✅ Authority profile created');
        } else if (selectedRole === 'distributor') {
          // Distributor needs to complete profile later
          console.log('Creating distributor profile...');
          await Distributor.create({
            user_id: userId,
            distributor_name: req.user.display_name,
            company_name: 'To be updated', // Temporary, to be updated
            phone: 'To be updated',
            email: req.user.email
          });
          console.log('✅ Distributor profile created');
        } else if (selectedRole === 'laboratory') {
          // Create a laboratory profile placeholder; lab can complete details later
          console.log('Creating laboratory profile...');
          const Laboratory = require('../models/Laboratory');
          try {
            await Laboratory.create({
              user_id: userId,
              lab_name: req.user.display_name || 'Unnamed Lab',
              license_number: `TEMP_${Date.now()}`,
              phone: 'To be updated', // Changed from null to placeholder string
              email: req.user.email,
              state: null,
              district: null,
              taluk: null,
              address: null
            });
            console.log('✅ Laboratory profile created');
          } catch (e) {
            console.warn('Failed to create laboratory placeholder:', e?.message || e);
            // Continue - don't fail the entire login
          }
        }
      } catch (profileErr) {
        console.error(`❌ Failed to create ${selectedRole} profile:`, profileErr?.message || profileErr);
        throw profileErr; // Re-throw to be caught by outer catch
      }

      const newUser = await User.findById(userId);

      const token = jwt.sign(
        {
          user_id: newUser.user_id,
          email: newUser.email,
          role: newUser.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      return res.redirect(`${frontendUrl}/auth/callback?token=${token}&newUser=true`);

    } catch (err) {
      console.error("❌ Google callback error:", {
        message: err?.message,
        code: err?.code,
        stack: err?.stack,
        email: req.user?.email,
        role: req.query.state || req.user?.intendedRole,
        timestamp: new Date().toISOString()
      });
      
      const errMsg = encodeURIComponent((err && err.message) || 'callback_error');
      const attempted = encodeURIComponent(req.query.state || (req.user && req.user.intendedRole) || '');
      return res.redirect(`${frontendUrl}/login?error=callback_error&attempted_role=${attempted}&message=${errMsg}`);
    }
  }
);

// ======================================================
// GET CURRENT USER
// ======================================================
router.get("/me", authMiddleware, async (req, res) => {
  try {
    let user;
    
    switch (req.user.role) {
      case 'farmer':
        user = await User.getUserWithFarmerDetails(req.user.user_id);
        break;
      case 'veterinarian':
        user = await User.getUserWithVeterinarianDetails(req.user.user_id);
        break;
      case 'authority':
        user = await User.getUserWithAuthorityDetails(req.user.user_id);
        break;
      case 'distributor':
        user = await User.getUserWithDistributorDetails(req.user.user_id);
        break;
      default:
        user = await User.findById(req.user.user_id);
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
    const { 
      display_name, full_name, phone, address, state, district, taluk,
      vet_name, license_number, department, designation 
    } = req.body;

    const userRole = req.user.role;
    
    // Use display_name, full_name, or existing user name as fallback
    const nameToUpdate = display_name || full_name || req.user.display_name || req.user.full_name;
    
    if (!nameToUpdate) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    // Update base user info (but NOT role - role is LOCKED)
    await User.update(req.user.user_id, {
      display_name: nameToUpdate,
      state,
      district,
      taluk
    });

    // Update role-specific profile
    if (userRole === 'farmer') {
      const farmer = await Farmer.getByUserId(req.user.user_id);
      if (farmer) {
        await Farmer.update(req.user.user_id, { address });
      }
      // Also update contact info in users table
      await User.updateFarmerContact(req.user.user_id, {
        phone, email: null, state, district, taluk
      });
    } else if (userRole === 'veterinarian') {
      const vet = await Veterinarian.getByUserId(req.user.user_id);
      if (vet) {
        await Veterinarian.update(req.user.user_id, {
          vet_name: vet_name || display_name || nameToUpdate,
          license_number: license_number || vet.license_number,
          phone
        });
      } else {
        await Veterinarian.create({
          user_id: req.user.user_id,
          vet_name: vet_name || display_name || nameToUpdate,
          license_number,
          phone
        });
      }
    } else if (userRole === 'authority') {
      const auth = await Authority.getByUserId(req.user.user_id);
      if (auth) {
        await Authority.update(req.user.user_id, {
          department,
          designation,
          phone,
          state,
          district,
          taluk
        });
      } else {
        await Authority.create({
          user_id: req.user.user_id,
          department,
          designation,
          phone,
          state,
          district,
          taluk
        });
      }
    } else if (userRole === 'distributor') {
      const { distributor_name, company_name, gst_number, email } = req.body;
      const dist = await Distributor.getByUserId(req.user.user_id);
      if (dist) {
        await Distributor.update(req.user.user_id, {
          distributor_name: distributor_name || nameToUpdate,
          company_name: company_name || dist.company_name,
          license_number,
          phone,
          email,
          address,
          state,
          district,
          taluk,
          gst_number
        });
      } else {
        await Distributor.create({
          user_id: req.user.user_id,
          distributor_name: distributor_name || nameToUpdate,
          company_name: company_name || 'To be updated',
          phone: phone || 'To be updated',
          email,
          address,
          state,
          district,
          taluk,
          gst_number
        });
      }
    }

    // Fetch updated user
    let updated;
    switch (userRole) {
      case 'farmer':
        updated = await User.getUserWithFarmerDetails(req.user.user_id);
        break;
      case 'veterinarian':
        updated = await User.getUserWithVeterinarianDetails(req.user.user_id);
        break;
      case 'authority':
        updated = await User.getUserWithAuthorityDetails(req.user.user_id);
        break;
      case 'distributor':
        updated = await User.getUserWithDistributorDetails(req.user.user_id);
        break;
      default:
        updated = await User.findById(req.user.user_id);
    }

    res.json({ user: updated, message: 'Profile updated successfully' });

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

// ======================================================
// CHECK ROLE (utility endpoint)
// ======================================================
router.get("/check-role/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const { type } = req.query; // 'aadhaar' or 'email'

    let user;
    if (type === 'aadhaar') {
      user = await User.findByAadhaar(identifier);
    } else {
      user = await User.findByEmail(identifier);
    }

    if (!user) {
      return res.json({ exists: false });
    }

    res.json({
      exists: true,
      role: user.role
    });
  } catch (err) {
    console.error("Check role error:", err);
    res.status(500).json({ error: "Failed to check role" });
  }
});

console.log('authRoutes router type:', typeof router);
module.exports = router;
