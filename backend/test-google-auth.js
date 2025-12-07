// Test Google OAuth URL generation
require('dotenv').config();

console.log('\n=== GOOGLE OAUTH CONFIGURATION ===\n');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '***SET***' : 'MISSING');
console.log('GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);
console.log('BACKEND_URL:', process.env.BACKEND_URL);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

// Simulate what passport.js does
const callbackURL = process.env.GOOGLE_CALLBACK_URL || 
                    (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/auth/google/callback` : '/api/auth/google/callback');

console.log('\n=== CALCULATED CALLBACK URL ===');
console.log('Callback URL that will be used:', callbackURL);

console.log('\n=== GOOGLE CLOUD CONSOLE CHECK ===');
console.log('Make sure this EXACT URL is in your Authorized redirect URIs:');
console.log(callbackURL);

console.log('\n=== OAUTH CONSENT SCREEN CHECK ===');
console.log('1. Go to: https://console.cloud.google.com/apis/credentials/consent');
console.log('2. Publishing status should be "Testing"');
console.log('3. Add your test email to "Test users"');
console.log('4. Or set to "In production" (requires verification)');
