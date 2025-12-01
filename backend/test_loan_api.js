const db = require('./config/database');
const jwt = require('jsonwebtoken');
const http = require('http');

async function testAuthenticatedRequest() {
  try {
    // First get an authority user
    const [users] = await db.query(
      `SELECT u.user_id, u.email, u.display_name, u.role 
       FROM users u 
       WHERE u.role = 'authority' 
       LIMIT 1`
    );
    
    if (users.length === 0) {
      console.log('No authority user found');
      process.exit(1);
    }
    
    const user = users[0];
    console.log('Using authority user:', user);
    
    // Create a test token (using the same secret as the server)
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '1h' }
    );
    
    console.log('\nTest token created:', token.substring(0, 50) + '...');
    
    // Make HTTP request to the loan detail endpoint
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/loans/applications/1',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    console.log('\nMaking request to:', options.path);
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('\nResponse Status:', res.statusCode);
        console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
        try {
          const parsed = JSON.parse(data);
          console.log('Response Body:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('Response Body (raw):', data);
        }
        process.exit(0);
      });
    });
    
    req.on('error', (e) => {
      console.error('Request error:', e.message);
      process.exit(1);
    });
    
    req.end();
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

testAuthenticatedRequest();
