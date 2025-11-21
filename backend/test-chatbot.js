const axios = require('axios');

async function testChatbotAPI() {
  try {
    const response = await axios.post('http://localhost:5000/api/chatbot/chat', {
      message: 'Hello, can you help me with farm management?',
      language: 'english'
    });

    console.log('✅ Chatbot API is working!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('❌ Chatbot API test failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
  }
}

testChatbotAPI();