require('dotenv').config();
console.log('Environment loaded. API Key:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try with gemini-2.0-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = "Hello Gemini, can you hear me? Please respond with a simple greeting.";

    console.log('Testing Gemini API with gemini-2.0-flash...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ Gemini API is working!');
    console.log('Response:', text);
  } catch (error) {
    console.error('❌ Gemini API test failed:');
    console.error('Error:', error.message);
    if (error.message.includes('API_KEY')) {
      console.error('The API key appears to be invalid or expired.');
    }
  }
}

testGeminiAPI();