require('dotenv').config();
console.log('Environment loaded. API Key:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');
const { GoogleGenAI } = require('@google/genai');

async function testGeminiAPI() {
  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = "Hello Gemini, can you hear me? Please respond with a simple greeting.";

    console.log('Testing Gemini API with gemini-1.5-flash...');
    const response = await genAI.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = response.text;

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