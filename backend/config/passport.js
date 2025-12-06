const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const db = require('./database');

module.exports = function(passport) {
  // ================================================================
  // LOCAL STRATEGY - DISABLED FOR FARMERS (they use OTP)
  // Only for backward compatibility / admin purposes
  // ================================================================
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
          return done(null, false, { message: 'No user with that email' });
        }
        
        const user = users[0];
        
        // Farmers must use OTP login
        if (user.role === 'farmer') {
          return done(null, false, { message: 'Farmers must use Aadhaar + OTP login' });
        }
        
        if (user.auth_provider === 'google') {
          return done(null, false, { message: 'Please use Google login' });
        }
        
        if (!user.password_hash) {
          return done(null, false, { message: 'Password login not available for this account' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
          return done(null, false, { message: 'Password incorrect' });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  // ================================================================
  // GOOGLE STRATEGY - FOR AUTHORITY AND VETERINARIAN ONLY
  // ================================================================
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',  // Relative URL - works on any domain
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // Get the intended role from state parameter
          const intendedRole = req.query.state;
          
          // BLOCK farmers from using Google login
          if (intendedRole === 'farmer') {
            return done(null, false, { message: 'Farmers cannot use Google login. Please use Aadhaar + OTP.' });
          }
          
          const [users] = await db.query('SELECT * FROM users WHERE google_uid = ?', [profile.id]);
          
          if (users.length > 0) {
            const existingUser = users[0];
            
            // CRITICAL: Role is LOCKED - cannot change after first registration
            // Pass existing user data for the callback to handle role validation
            existingUser.intendedRole = intendedRole;
            return done(null, existingUser);
          }
          
          // New user - don't create here, let the callback handle it
          // This allows for proper role validation before user creation
          const newUserData = {
            google_uid: profile.id,
            email: profile.emails[0].value,
            display_name: profile.displayName,
            intendedRole: intendedRole,
            isNew: true
          };
          
          return done(null, newUserData);
        } catch (err) {
          return done(err);
        }
      }
    ));
  }

  passport.serializeUser((user, done) => {
    done(null, user.user_id || user.google_uid);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      // Try to find by user_id first
      let [users] = await db.query('SELECT * FROM users WHERE user_id = ?', [id]);
      
      if (users.length === 0) {
        // Try by google_uid
        [users] = await db.query('SELECT * FROM users WHERE google_uid = ?', [id]);
      }
      
      if (users.length === 0) {
        return done(null, false);
      }
      
      const user = users[0];
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};
