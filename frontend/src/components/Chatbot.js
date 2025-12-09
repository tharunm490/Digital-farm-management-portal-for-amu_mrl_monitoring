import React, { useState, useRef, useEffect } from 'react';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Namaste! I'm KrushiAI, your farming companion. I can help you with livestock management, treatment tracking, vaccination schedules, and farm compliance. What would you like to know about your farm today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('english');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const voicesRef = useRef([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        text: "Namaste! I'm KrushiAI, your farming companion. I can help you with livestock management, treatment tracking, vaccination schedules, and farm compliance. What would you like to know about your farm today?",
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for voice support
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsVoiceSupported(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language === 'english' ? 'en-US' : 
                                   language === 'hindi' ? 'hi-IN' :
                                   language === 'telugu' ? 'te-IN' :
                                   language === 'tamil' ? 'ta-IN' : 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Load voices for speech synthesis
    const loadVoices = () => {
      voicesRef.current = speechSynthesis.getVoices();
    };

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [language]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(`${API_URL}/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          language: language
        })
      });

      const data = await response.json();

      if (response.ok) {
        const botMessage = {
          id: messages.length + 2,
          text: data.response,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: messages.length + 2,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startVoiceRecording = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'english' ? 'en-US' :
                      language === 'hindi' ? 'hi-IN' :
                      language === 'telugu' ? 'te-IN' :
                      language === 'tamil' ? 'ta-IN' : 'en-US';

      // Try to find a voice that matches the language
      const voices = voicesRef.current;
      const langMap = {
        english: 'en',
        hindi: 'hi',
        telugu: 'te',
        tamil: 'ta'
      };
      const langPrefix = langMap[language] || 'en';
      const matchingVoice = voices.find(voice => voice.lang.startsWith(langPrefix));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechSynthesis.speak(utterance);
    }
  };

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'hindi', label: 'हिंदी' },
    { value: 'telugu', label: 'తెలుగు' },
    { value: 'tamil', label: 'தமிழ்' }
  ];

  return (
    <>
      {/* Chatbot Toggle Button */}
      <button 
        className="fixed bottom-6 right-6 w-16 h-16 bg-primary-600 hover:bg-primary-700 rounded-full shadow-strong flex items-center justify-center text-3xl transition-all duration-300 z-40 hover:scale-110"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle chatbot"
      >
        {isOpen ? '✕' : '🚜'}
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-strong flex flex-col z-40 animate-fade-in">
          {/* Header */}
          <div className="bg-primary-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🚜</span>
              <span className="font-semibold">KrushiAI - Farm Assistant</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={clearChat} 
                className="p-2 hover:bg-primary-700 rounded-lg transition-colors"
                title="Clear chat"
              >
                🗑️
              </button>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-primary-700 text-white text-sm px-2 py-1 rounded border-none outline-none"
              >
                {languages.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-2 hover:bg-primary-700 rounded-lg transition-colors text-xl"
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.sender === 'user' ? 'bg-primary-600 text-white' : 'bg-white text-gray-900'} rounded-lg p-3 shadow-soft`}>
                  <div className="text-sm">{message.text}</div>
                  {message.sender === 'bot' && (
                    <button
                      onClick={() => speakText(message.text)}
                      className="mt-2 text-xs opacity-70 hover:opacity-100 transition-opacity"
                      title="Speak this message"
                    >
                      {isSpeaking ? '🔊' : '🔈'}
                    </button>
                  )}
                  <div className={`text-xs mt-1 ${message.sender === 'user' ? 'text-primary-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-lg p-3 shadow-soft">
                  <div className="flex space-x-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about livestock health, treatments, vaccinations..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:bg-gray-100"
              />
              {isVoiceSupported && (
                <button
                  onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                  className={`px-4 py-2 rounded-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300'}`}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  {isListening ? '🎤' : '🎙️'}
                </button>
              )}
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;