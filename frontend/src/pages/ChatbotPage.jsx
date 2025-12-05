import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const ChatbotPage = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your Anime Knowledge Assistant. Ask me anything about anime, characters, or studios! 🎌' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const suggestedQuestions = [
    "Who is Naruto?",
    "Tell me about One Piece",
    "What anime has pirates?",
    "Who is the strongest character?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const clearChat = () => {
    setMessages([
      { role: 'assistant', content: 'Hi! I\'m your Anime Knowledge Assistant. Ask me anything about anime, characters, or studios! 🎌' }
    ]);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to chat
    const newUserMessage = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    setLoading(true);

    try {
      const conversationHistory = messages.slice(1);
      
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: userMessage,
          history: conversationHistory
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.message || 'Sorry, something went wrong. Please try again.' 
        }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Failed to connect to server. Please check your connection.' 
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestedQuestion = (question) => {
    setInput(question);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen anime-bg py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Chat Container */}
        <div className="flex flex-col h-[calc(100vh-10rem)] bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-purple-100">
          
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white p-5 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-lg">
                🤖
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Anime Assistant</h1>
                <p className="text-sm text-purple-100 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Powered by RAG & Knowledge Graph
                </p>
              </div>
            </div>
            <button 
              onClick={clearChat} 
              className="btn btn-sm bg-white/20 hover:bg-white/30 border-0 text-white gap-2 backdrop-blur-sm"
              title="Clear conversation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-purple-50/50 to-white">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-end gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}>
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                
                {/* Message Bubble */}
                <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-3 rounded-2xl shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-br-md' 
                      : 'bg-white border border-purple-100 text-gray-700 rounded-bl-md'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading Animation */}
            {loading && (
              <div className="flex items-end gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg shadow-md animate-pulse">
                  🤖
                </div>
                <div className="bg-white border border-purple-100 px-5 py-4 rounded-2xl rounded-bl-md shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-sm text-gray-400">Searching knowledge base...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions - Show only at start */}
          {messages.length === 1 && !loading && (
            <div className="px-6 py-4 bg-purple-50/50 border-t border-purple-100">
              <p className="text-xs text-gray-500 mb-3 font-medium">✨ Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="px-4 py-2 text-sm bg-white hover:bg-purple-100 text-purple-700 rounded-full border border-purple-200 hover:border-purple-300 transition-all duration-200 shadow-sm hover:shadow"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-purple-100">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me about anime, characters, studios..."
                className="input input-bordered flex-1 bg-gray-50 border-purple-200 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 rounded-xl"
                disabled={loading}
              />
              <button
                type="submit"
                className="btn bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                disabled={loading || !input.trim()}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Press Enter to send • Answers are based on our anime knowledge graph
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;
