const db = require('../config/database');
const crypto = require('crypto');

// OTP expiry time in minutes
const OTP_EXPIRY_MINUTES = 5;

const OTP = {
  /**
   * Generate a 6-digit OTP
   */
  generateOTP: () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  /**
   * Hash OTP for storage
   */
  hashOTP: (otp) => {
    return crypto.createHash('sha256').update(otp).digest('hex');
  },

  /**
   * Store OTP in database
   * @param {string} phone - Phone number
   * @param {string} aadhaar - Aadhaar number
   * @param {string} otp - Plain OTP (will be hashed)
   */
  store: async (phone, aadhaar, otp) => {
    const hashedOTP = OTP.hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Delete any existing OTPs for this phone/aadhaar combination
    await db.query(
      'DELETE FROM otp_verification WHERE phone = ? OR aadhaar_number = ?',
      [phone, aadhaar]
    );

    // Insert new OTP
    const [result] = await db.query(
      `INSERT INTO otp_verification (phone, aadhaar_number, otp_hash, expires_at, attempts) 
       VALUES (?, ?, ?, ?, 0)`,
      [phone, aadhaar, hashedOTP, expiresAt]
    );

    return result.insertId;
  },

  /**
   * Verify OTP
   * @param {string} phone - Phone number
   * @param {string} aadhaar - Aadhaar number
   * @param {string} otp - OTP to verify
   * @returns {Object} - { valid: boolean, error?: string }
   */
  verify: async (phone, aadhaar, otp) => {
    const [rows] = await db.query(
      `SELECT * FROM otp_verification 
       WHERE phone = ? AND aadhaar_number = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [phone, aadhaar]
    );

    if (rows.length === 0) {
      return { valid: false, error: 'No OTP found. Please request a new OTP.' };
    }

    const otpRecord = rows[0];

    // Check if OTP has expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      await OTP.delete(phone, aadhaar);
      return { valid: false, error: 'OTP has expired. Please request a new OTP.' };
    }

    // Check attempts (max 3 attempts)
    if (otpRecord.attempts >= 3) {
      await OTP.delete(phone, aadhaar);
      return { valid: false, error: 'Too many failed attempts. Please request a new OTP.' };
    }

    // Verify OTP hash
    const hashedInput = OTP.hashOTP(otp);
    if (hashedInput !== otpRecord.otp_hash) {
      // Increment attempts
      await db.query(
        'UPDATE otp_verification SET attempts = attempts + 1 WHERE id = ?',
        [otpRecord.id]
      );
      return { valid: false, error: 'Invalid OTP. Please try again.' };
    }

    // OTP is valid - delete it
    await OTP.delete(phone, aadhaar);
    return { valid: true };
  },

  /**
   * Delete OTP record
   */
  delete: async (phone, aadhaar) => {
    await db.query(
      'DELETE FROM otp_verification WHERE phone = ? AND aadhaar_number = ?',
      [phone, aadhaar]
    );
  },

  /**
   * Cleanup expired OTPs (can be run periodically)
   */
  cleanupExpired: async () => {
    await db.query('DELETE FROM otp_verification WHERE expires_at < NOW()');
  }
};

module.exports = OTP;
