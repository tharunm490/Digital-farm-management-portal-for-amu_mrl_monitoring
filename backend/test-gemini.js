const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  try {
    const genAI = new GoogleGenerativeAI('AIzaSyDBZC_Lj5QRrdVzDCMc9k9MLGjG1wPiINE');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = "Hello Gemini, can you hear me? Please respond with a simple greeting.";

    console.log('Testing Gemini API...');
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