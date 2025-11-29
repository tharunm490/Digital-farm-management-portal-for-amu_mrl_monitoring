const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const db = require('./database');

module.exports = function(passport) {
  // Local Strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
          return done(null, false, { message: 'No user with that email' });
        }
        
        const user = users[0];
        
        if (user.auth_provider === 'google') {
          return done(null, false, { message: 'Please use Google login' });
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

  // Google Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const [users] = await db.query('SELECT * FROM users WHERE google_uid = ?', [profile.id]);
          
          if (users.length > 0) {
            return done(null, users[0]);
          }
          
          // Create new user
          const [result] = await db.query(
            `INSERT INTO users (auth_provider, google_uid, email, display_name, role) 
             VALUES ('google', ?, ?, ?, 'farmer')`,
            [profile.id, profile.emails[0].value, profile.displayName]
          );
          
          const [newUser] = await db.query('SELECT * FROM users WHERE user_id = ?', [result.insertId]);
          
          return done(null, newUser[0]);
        } catch (err) {
          return done(err);
        }
      }
    ));
  }

  passport.serializeUser((user, done) => {
    done(null, user.user_id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const [users] = await db.query('SELECT * FROM users WHERE user_id = ?', [id]);
      const user = users[0];
      
      // Ensure user has a role (for backward compatibility)
      if (!user.role) {
        user.role = 'farmer';
        // Update the database
        await db.query('UPDATE users SET role = ? WHERE user_id = ?', ['farmer', user.user_id]);
      }
      
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};
