import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';

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
                                   language === 'kannada' ? 'kn-IN' :
                                   language === 'telugu' ? 'te-IN' :
                                   language === 'tamil' ? 'ta-IN' :
                                   language === 'malayalam' ? 'ml-IN' : 'en-US';

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
      const response = await fetch('/api/chatbot/chat', {
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
                      language === 'kannada' ? 'kn-IN' :
                      language === 'telugu' ? 'te-IN' :
                      language === 'tamil' ? 'ta-IN' :
                      language === 'malayalam' ? 'ml-IN' : 'en-US';

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechSynthesis.speak(utterance);
    }
  };

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'kannada', label: 'ಕನ್ನಡ' },
    { value: 'telugu', label: 'తెలుగు' },
    { value: 'tamil', label: 'தமிழ்' },
    { value: 'malayalam', label: 'മലയാളം' },
    { value: 'hindi', label: 'हिंदी' }
  ];

  return (
    <>
      {/* Chatbot Toggle Button */}
      <div className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)}>
        <div className="chatbot-icon">
          {isOpen ? '✕' : '🚜'}
        </div>
      </div>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="chatbot-container">
          <div className="chatbot-header">
            <div className="chatbot-title">
              <span className="chatbot-avatar">🚜</span>
              KrushiAI - Farm Assistant
            </div>
            <div className="chatbot-controls">
              <button onClick={() => setIsOpen(false)} className="close-button" title="Close chat">
                ✕
              </button>
              <button onClick={clearChat} className="clear-button" title="Clear chat">
                🗑️
              </button>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="language-select"
              >
                {languages.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="chatbot-messages">
            {messages.map(message => (
              <div
                key={message.id}
                className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
              >
                <div className="message-content">
                  {message.text}
                  {message.sender === 'bot' && (
                    <button
                      onClick={() => speakText(message.text)}
                      className="speak-button"
                      title="Speak this message"
                    >
                      {isSpeaking ? '🔊' : '🔈'}
                    </button>
                  )}
                </div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message bot-message">
                <div className="message-content typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about livestock health, treatments, vaccinations..."
              disabled={isLoading}
            />
            {isVoiceSupported && (
              <button
                onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                className={`voice-button ${isListening ? 'listening' : ''}`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? '🎤' : '🎙️'}
              </button>
            )}
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="send-button"
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;