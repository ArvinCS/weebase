import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const ChatbotPage = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your Anime Knowledge Assistant. Ask me anything about anime, characters, or studios!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const clearChat = () => {
    setMessages([
      { role: 'assistant', content: 'Hi! I\'m your Anime Knowledge Assistant. Ask me anything about anime, characters, or studios!' }
    ]);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      // Send only the message history (excluding initial greeting and current message)
      // Filter out the initial greeting for the API call
      const conversationHistory = messages.slice(1); // Remove initial greeting
      
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: userMessage,
          history: conversationHistory  // Include conversation history
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
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-base-200 rounded-box shadow-md">
      {/* Chat Header */}
      <div className="bg-primary text-primary-content p-4 rounded-t-box flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Anime Chatbot</h1>
          <p className="text-sm opacity-80">Powered by RAG & Knowledge Graph</p>
        </div>
        <button 
          onClick={clearChat} 
          className="btn btn-sm btn-ghost"
          title="Clear conversation"
        >
          🗑️ Clear
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}
          >
            <div className="chat-image avatar">
              <div className="w-10 rounded-full bg-neutral text-neutral-content flex items-center justify-center">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
            </div>
            <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="w-10 rounded-full bg-neutral text-neutral-content flex items-center justify-center">
                🤖
              </div>
            </div>
            <div className="chat-bubble chat-bubble-secondary">
              <span className="loading loading-dots loading-sm"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-4 bg-base-300 rounded-b-box">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me about anime, characters, studios..."
            className="input input-bordered flex-1"
            disabled={loading}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatbotPage;
