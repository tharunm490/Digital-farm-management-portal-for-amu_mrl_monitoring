const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Default system prompt
const SYSTEM_PROMPT = `
You are KrushiAI — a helpful assistant for digital livestock farm management.
You help users understand:
- AMU (Antimicrobial Use)
- MRL values and residue safety
- Withdrawal periods
- Treatment management
- Vaccinations
- Farm analytics
- Dashboard features

IMPORTANT:
- Never prescribe medicines.
- Never give treatment dosages.
- Guide users safely using general principles.
- Follow Indian FSSAI standards.
`;

// Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, language = 'english', context = {} } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const lowerMessage = message.toLowerCase().trim();

    // Identity responses
    if (
      lowerMessage === "who are you?" ||
      lowerMessage.includes("who are you") ||
      lowerMessage.includes("what can you do")
    ) {
      return res.json({
        response:
          "I am KrushiAI — your assistant for livestock farm management. I help you understand AMU, MRL, withdrawal periods, vaccinations, and your dashboard features. I guide you safely but never prescribe medicines.",
        language,
        timestamp: new Date().toISOString(),
      });
    }

    // Basic replies if Gemini key missing
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        response:
          "Gemini API key missing — chatbot is running in basic mode. How can I help you with farm management?",
        language,
        timestamp: new Date().toISOString(),
      });
    }

    // Build prompt
    let prompt = SYSTEM_PROMPT + "\n\n";
    prompt += `Respond in ${language} language.\n\n`;
    prompt += `User Question: ${message}\n\n`;
    prompt += `Assistant Response:\n`;

    // Generate response using GoogleGenAI
    const response = await genAI.generateText({
      model: 'gemini-1.5-flash',
      prompt: prompt,
      temperature: 0.7,
      maxOutputTokens: 2048,
    });

    const text = response.text || response;

    res.json({
      response: text,
      language,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({
      error: "Failed to process chat request",
      details: error.message
    });
  }
});

// Voice endpoint placeholder
router.post('/voice', (req, res) => {
  res.json({
    transcription: "Voice processing not yet implemented",
    response: "Voice assistant feature coming soon",
    language: req.body.language || "english",
  });
});

// Translation endpoint
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = "english" } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ error: "Text and target language are required" });
    }

    const prompt = `Translate this from ${sourceLanguage} to ${targetLanguage}. Only the translation:\n\n${text}`;

    const response = await genAI.generateText({
      model: 'gemini-1.5-flash',
      prompt: prompt,
      temperature: 0.3,
    });

    const translation = (response.text || response).trim();

    res.json({
      original: text,
      translation,
      sourceLanguage,
      targetLanguage,
    });

  } catch (error) {
    console.error("Translation API error:", error);
    res.status(500).json({
      error: "Failed to translate text",
      details: error.message,
    });
  }
});

// Simple context route
router.get('/context', (req, res) => {
  res.json({
    supportedLanguages: ['english', 'kannada', 'telugu', 'tamil', 'malayalam', 'hindi'],
    features: [
      'AMU Monitoring',
      'MRL Compliance',
      'Treatment Recording',
      'Vaccination Management',
      'Farm Analytics',
      'Withdrawal Period Calculation'
    ]
  });
});

module.exports = router;
