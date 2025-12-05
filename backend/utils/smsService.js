/**
 * SMS Service - Sends OTP via Fast2SMS API
 * 
 * This module sends OTP messages using Fast2SMS API
 * 
 * Requirements:
 * - Fast2SMS account
 * - FAST2SMS_API_KEY in .env
 */

const axios = require('axios');

// Fast2SMS API configuration - Using OTP route for transactional messages
const FAST2SMS_OTP_URL = 'https://www.fast2sms.com/dev/bulkV2';

const SMSService = {
  /**
   * Send SMS message using Fast2SMS API
   * @param {string} phoneNumber - Recipient phone number (10 digits)
   * @param {string} message - Message to send
   * @returns {Object} - { success: boolean, error?: string }
   */
  sendSMS: async (phoneNumber, message) => {
    try {
      // Clean phone number - remove spaces, dashes, + and get last 10 digits
      let cleanNumber = phoneNumber.replace(/[\s\-+]/g, '');
      
      // Get last 10 digits if more than 10
      if (cleanNumber.length > 10) {
        cleanNumber = cleanNumber.slice(-10);
      }

      // Extract OTP from message if present (for OTP route)
      const otpMatch = message.match(/\b(\d{6})\b/);
      const otp = otpMatch ? otpMatch[1] : null;

      console.log('='.repeat(50));
      console.log('📱 Sending SMS via Fast2SMS (OTP Route)');
      console.log(`To: ${cleanNumber}`);
      console.log(`Message: ${message}`);
      if (otp) console.log(`Extracted OTP: ${otp}`);
      console.log('='.repeat(50));

      // Try OTP route first (bypasses DND for OTP messages)
      if (otp) {
        try {
          const otpResponse = await axios.get(FAST2SMS_OTP_URL, {
            params: {
              authorization: process.env.FAST2SMS_API_KEY,
              variables_values: otp,
              route: 'otp',
              numbers: cleanNumber
            }
          });

          console.log('✅ Fast2SMS OTP Route Response:');
          console.log('Full Response:', JSON.stringify(otpResponse.data, null, 2));
          
          if (otpResponse.data.return === true) {
            return { success: true, data: otpResponse.data };
          }
        } catch (otpError) {
          console.log('⚠️ OTP route failed, trying DLT route...');
          console.log('Error:', otpError.response?.data || otpError.message);
        }
      }

      // Fallback to DLT/Transactional route (v3)
      const response = await axios.get(FAST2SMS_OTP_URL, {
        params: {
          authorization: process.env.FAST2SMS_API_KEY,
          message: message,
          language: 'english',
          route: 'v3',  // DLT transactional route
          sender_id: 'TXTIND',
          numbers: cleanNumber
        }
      });

      console.log('✅ Fast2SMS Response:');
      console.log('Status:', response.data.return);
      console.log('Message:', response.data.message);
      console.log('Request ID:', response.data.request_id);
      console.log('Full Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.return === true) {
        return { success: true, data: response.data };
      } else {
        return { 
          success: false, 
          error: response.data.message || 'SMS sending failed',
          data: response.data
        };
      }
      
    } catch (error) {
      console.error('❌ Fast2SMS sending failed:', error.response?.data || error.message);
      
      // Log OTP to console for development fallback
      console.log('='.repeat(50));
      console.log('📱 FAST2SMS FALLBACK (Error occurred)');
      console.log(`To: ${phoneNumber}`);
      console.log(`Message: ${message}`);
      console.log('Error:', error.response?.data?.message || error.message);
      console.log('='.repeat(50));
      
      return { 
        success: false, 
        fallback: true, 
        error: error.response?.data?.message || error.message 
      };
    }
  },

  /**
   * Send login code via Fast2SMS (Quick SMS route)
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} code - Login code
   */
  sendOTP: async (phoneNumber, code) => {
    const message = `Your login code for Farm Management Portal is: ${code}`;
    return await SMSService.sendSMS(phoneNumber, message);
  }
};

module.exports = SMSService;
