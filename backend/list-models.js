require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function listModels() {
  try {
    console.log('API Key:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    console.log('Fetching available models...\n');
    const response = await genAI.models.list();
    
    console.log('Available models:');
    console.log('================');
    
    if (response.models && response.models.length > 0) {
      response.models.forEach(model => {
        console.log(`\n✓ ${model.name}`);
        console.log(`  Display Name: ${model.displayName || 'N/A'}`);
        console.log(`  Supports: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      });
    } else {
      console.log('No models found or API key has no access.');
    }
    
  } catch (error) {
    console.error('❌ Error listing models:');
    console.error(error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
  }
}

listModels();
