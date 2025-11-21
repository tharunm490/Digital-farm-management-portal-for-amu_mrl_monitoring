const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Load domain knowledge
let domainKnowledge = {};
try {
  const knowledgePath = path.join(__dirname, '../../frontend/src/data/dosage_reference_full_extended.json');
  domainKnowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
} catch (error) {
  console.error('Error loading domain knowledge:', error);
}

// System prompt for domain-specific responses
const SYSTEM_PROMPT = `You are KrushiAI — your intelligent assistant for digital livestock farm management.

You help users understand AMU, MRL, withdrawal periods, vaccination planning, treatment records, and how to use their farm dashboard.
You do not prescribe medicines, but guide users safely using their system's data.

DOMAIN EXPERTISE (Answer ONLY about these topics):
- Digital livestock farm management system features
- Antimicrobial Usage (AMU) monitoring and tracking
- Maximum Residue Limits (MRL) compliance
- Withdrawal periods calculation and management
- Treatment recording workflow and processes
- Vaccination schedules and management
- JSON-based recommendation engine functionality
- ML prediction pipeline for MRL and withdrawal periods
- Dashboard features and analytics
- Database structure (farms, animals, treatment_records, amu_records)

RESTRICTIONS (NEVER do these):
- Provide medical doses or amounts
- Recommend antibiotics or treatments
- Give treatment amounts or quantities
- Make medical decisions
- Go outside the farm management domain
- Hallucinate information

RESPONSE GUIDELINES:
- Be helpful and informative about system features
- Explain how the system works
- Guide users on using features
- Use the provided context and domain knowledge
- If asked about doses: "Dosing decisions must be entered through the treatment entry form, where recommended options are provided based on FSSAI rules. I cannot give direct dosage amounts."
- Keep responses clear and concise
- Use the user's preferred language when responding

CONTEXT AVAILABLE:
- Dosage reference data with medicine categories and species compatibility
- Treatment workflow information
- MRL compliance rules
- AMU monitoring processes
- Vaccination scheduling logic`;

// Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, language = 'english', context = {} } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check for specific identity questions
    const lowerMessage = message.toLowerCase().trim();
    if (lowerMessage === 'who are you?' || lowerMessage === 'what can you do?' ||
        lowerMessage.includes('who are you') || lowerMessage.includes('what can you do')) {
      const identityResponse = "I am KrushiAI — your intelligent assistant for digital livestock farm management.\nI help you understand AMU, MRL, withdrawal periods, vaccination planning, treatment records, and how to use your farm dashboard.\nI do not prescribe medicines, but I guide you safely using your system's data";

      return res.json({
        response: identityResponse,
        language: language,
        timestamp: new Date().toISOString()
      });
    }

    // Get Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Build context from available data
    let contextPrompt = SYSTEM_PROMPT;

    // Add domain knowledge context
    if (domainKnowledge && Object.keys(domainKnowledge).length > 0) {
      const species = Object.keys(domainKnowledge);
      const categories = new Set();
      
      // Collect all unique categories across species
      species.forEach(spec => {
        if (domainKnowledge[spec]) {
          Object.keys(domainKnowledge[spec]).forEach(cat => categories.add(cat));
        }
      });
      
      contextPrompt += `\n\nAVAILABLE SPECIES: ${species.join(', ')}`;
      contextPrompt += `\n\nAVAILABLE MEDICINE CATEGORIES: ${Array.from(categories).join(', ')}`;
    }

    // Add user context if provided
    if (context.currentEntity) {
      contextPrompt += `\n\nCURRENT CONTEXT: User is working with ${context.currentEntity.type} - ${context.currentEntity.species}`;
    }

    if (context.recentTreatments && context.recentTreatments.length > 0) {
      contextPrompt += `\n\nRECENT TREATMENTS: ${context.recentTreatments.length} treatment(s) recorded`;
    }

    // Add language instruction
    const languageInstructions = {
      english: 'Respond in English.',
      kannada: 'Respond in Kannada language.',
      telugu: 'Respond in Telugu language.',
      tamil: 'Respond in Tamil language.',
      malayalam: 'Respond in Malayalam language.',
      hindi: 'Respond in Hindi language.'
    };

    contextPrompt += `\n\n${languageInstructions[language] || 'Respond in English.'}`;

    const prompt = `${contextPrompt}\n\nUser Query: ${message}\n\nAssistant Response:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      response: text,
      language: language,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error.message
    });
  }
});

// Voice endpoint (placeholder for future implementation)
router.post('/voice', async (req, res) => {
  try {
    const { audio, language = 'english' } = req.body;

    // For now, return a placeholder response
    // In production, this would process audio with speech-to-text
    res.json({
      transcription: 'Voice processing not yet implemented',
      response: 'Voice assistant feature coming soon',
      language: language
    });

  } catch (error) {
    console.error('Voice API error:', error);
    res.status(500).json({
      error: 'Failed to process voice request',
      details: error.message
    });
  }
});

// Translation endpoint
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = 'english' } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Text and target language are required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Only provide the translation, no additional text:

${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translation = response.text().trim();

    res.json({
      original: text,
      translation: translation,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage
    });

  } catch (error) {
    console.error('Translation API error:', error);
    res.status(500).json({
      error: 'Failed to translate text',
      details: error.message
    });
  }
});

// Context loader endpoint
router.get('/context', async (req, res) => {
  try {
    // Return available context information
    const species = Object.keys(domainKnowledge || {});
    const categories = new Set();
    
    // Collect all unique categories across species
    species.forEach(spec => {
      if (domainKnowledge[spec]) {
        Object.keys(domainKnowledge[spec]).forEach(cat => categories.add(cat));
      }
    });
    
    const totalMedicines = species.reduce((sum, spec) => {
      if (domainKnowledge[spec]) {
        return sum + Object.values(domainKnowledge[spec]).reduce((catSum, cat) => 
          catSum + Object.keys(cat).length, 0);
      }
      return sum;
    }, 0);

    const context = {
      species: species,
      categories: Array.from(categories),
      totalMedicines: totalMedicines,
      supportedLanguages: ['english', 'kannada', 'telugu', 'tamil', 'malayalam', 'hindi'],
      features: [
        'AMU Monitoring',
        'MRL Compliance',
        'Treatment Recording',
        'Vaccination Management',
        'Farm Analytics',
        'Withdrawal Period Calculation'
      ]
    };

    res.json(context);

  } catch (error) {
    console.error('Context API error:', error);
    res.status(500).json({
      error: 'Failed to load context',
      details: error.message
    });
  }
});

module.exports = router;