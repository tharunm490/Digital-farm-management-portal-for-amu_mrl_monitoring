/**
 * Test SMS Service
 * Run: node test_sms.js <phone_number>
 * Example: node test_sms.js 9876543210
 */

require('dotenv').config();
const SMSService = require('./utils/smsService');

async function testSMS() {
  // Get phone number from command line argument
  const phoneNumber = process.argv[2];
  
  if (!phoneNumber) {
    console.log('❌ Usage: node test_sms.js <phone_number>');
    console.log('Example: node test_sms.js 9876543210');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📱 SMS SERVICE TEST');
  console.log('='.repeat(60));
  
  // Check if API key is configured
  console.log('\n1️⃣ Checking API Key Configuration...');
  if (!process.env.FAST2SMS_API_KEY) {
    console.log('❌ FAST2SMS_API_KEY is not set in .env file!');
    process.exit(1);
  }
  console.log('✅ FAST2SMS_API_KEY is configured');
  console.log(`   Key (first 10 chars): ${process.env.FAST2SMS_API_KEY.substring(0, 10)}...`);

  // Test OTP sending
  console.log('\n2️⃣ Sending Test OTP...');
  console.log(`   Phone Number: ${phoneNumber}`);
  
  const testCode = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`   Test OTP: ${testCode}`);
  
  try {
    const result = await SMSService.sendOTP(phoneNumber, testCode);
    
    console.log('\n3️⃣ Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ SMS sent successfully!');
      console.log('   Check your phone for the OTP.');
    } else {
      console.log('\n❌ SMS sending failed!');
      console.log('   Error:', result.error);
      
      if (result.fallback) {
        console.log('\n⚠️  Fallback mode: OTP was logged to console.');
      }
      
      // Common issues
      console.log('\n📋 Common Issues:');
      console.log('   1. Invalid API key - Check Fast2SMS dashboard');
      console.log('   2. Insufficient balance - Add credits to Fast2SMS');
      console.log('   3. Invalid phone number format - Use 10 digit number');
      console.log('   4. DND enabled on number - Promotional SMS blocked');
      console.log('   5. API route issues - Try transactional route instead');
    }
  } catch (error) {
    console.log('\n❌ Exception occurred:');
    console.log(error);
  }
  
  console.log('\n' + '='.repeat(60));
}

testSMS();
