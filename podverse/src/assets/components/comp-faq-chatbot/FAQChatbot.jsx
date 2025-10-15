import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageCircle, Mic, Settings, Zap, Users, Book, ChevronRight, ShieldCheck } from 'lucide-react';
import {getSupabaseAuthorizedtoken } from '../../supabaseClient'
import { MdSecurityUpdateWarning } from 'react-icons/md';

const FAQChatbot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "👋 Welcome to Podverse! I'm your AI assistant. Ask me anything about podcasting, recording, or our features!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const API_URL = "http://localhost:8000";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputMessage]);

  const quickQuestions = [
    { 
      icon: <Mic className="w-5 h-5" />, 
      text: "How do I start recording?",
      gradient: "from-purple-500 to-purple-600"
    },
    { 
      icon: <Settings className="w-5 h-5" />, 
      text: "What audio formats are supported?",
      gradient: "from-blue-500 to-blue-600"
    },
    { 
      icon: <Sparkles className="w-5 h-5" />, 
      text: "Tell me about AI features",
      gradient: "from-pink-500 to-pink-600"
    },
    { 
      icon: <ShieldCheck className="w-5 h-5" />, 
      text: "Is my data secure on PodVerse?",
      gradient: "from-indigo-500 to-indigo-600"
    },

    { 
      icon: <Zap className="w-5 h-5" />, 
      text: "Export and distribution options",
      gradient: "from-violet-500 to-violet-600"
    },
    { 
      icon: <Book className="w-5 h-5" />, 
      text: "Editing and post-production",
      gradient: "from-fuchsia-500 to-fuchsia-600"
    }
  ];

  const queryFAQ = async (userMessage) => {
    try {
      const token = await getSupabaseAuthorizedtoken();
      const formData = new FormData();
      formData.append('query', userMessage);
      formData.append('use_ai', 'true');
      
      const response = await fetch(`${API_URL}/faq/query/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to query FAQ');
      }

      const data = await response.json();
      return data.answer || "I couldn't find an answer to that question.";
    } catch (error) {
      console.error('FAQ query failed:', error);
      return `Sorry, I encountered an error: ${error.message}`;
    }
  };

  const handleSendMessage = async (text = inputMessage) => {
    if (!text.trim()) return;

    const newUserMessage = {
      id: messages.length + 1,
      type: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsTyping(true);

    const answer = await queryFAQ(text);

    const botResponse = {
      id: messages.length + 2,
      type: 'bot',
      text: answer,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, botResponse]);
    setIsTyping(false);
  };

  // COMMENTED OUT: setupInitialFAQs function
  // const setupInitialFAQs = async () => {
  //   const faqs = [
  //     {
  //       question: "What is PodVerse?",
  //       answer: "PodVerse is an AI-powered podcast creation platform..."
  //     },
  //     // ... more FAQs
  //   ];

  //   try {
  //     const token = await getSupabaseAuthorizedtoken();
  //     const response = await fetch(`${API_URL}/faq/bulk-add/`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${token}`
  //       },
  //       body: JSON.stringify({ faqs: faqs })
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.detail || 'Failed to add FAQs');
  //     }

  //     const data = await response.json();
  //     console.log('✅ FAQs Setup Success:', data);
  //     alert(`Successfully added ${data.count} FAQs!`);
  //     
  //     const systemMessage = {
  //       id: messages.length + 1,
  //       type: 'bot',
  //       text: `✅ FAQ database has been set up with ${data.count} questions. You can now ask me anything!`,
  //       timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  //     };
  //     setMessages(prev => [...prev, systemMessage]);
  //     
  //   } catch (error) {
  //     console.error('❌ FAQs Setup Error:', error);
  //     alert(`Failed to add FAQs: ${error.message}`);
  //   }
  // };

  const handleQuickQuestion = (question) => {
    handleSendMessage(question);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full h-full p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-600 tracking-wide flex items-center gap-2">
              <MessageCircle className="w-7 h-7" />
              FAQ & Support Chat
            </h1>
            <p className="tracking-wider text-gray-500 text-base">
              Get instant answers to your questions 24/7
            </p>
          </div>
        </div>
      </div>

      <div className="border-2 rounded-lg shadow-sm overflow-hidden h-[calc(100vh-180px)] flex flex-col bg-white">
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-purple-50/20 via-white to-purple-50/10">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              style={{ animation: 'fadeIn 0.3s ease-in' }}
            >
              <div className={`flex items-start gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                  message.type === 'bot' 
                    ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white' 
                    : 'bg-gradient-to-br from-purple-200 to-purple-300 text-purple-800'
                }`}>
                  {message.type === 'bot' ? (
                    <Sparkles className="w-5 h-5" />
                  ) : (
                    <span className="font-bold text-sm">You</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <div className={`rounded-2xl px-5 py-3.5 ${
                    message.type === 'bot'
                      ? 'bg-white border-2 border-purple-100 shadow-md hover:shadow-lg transition-shadow'
                      : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.text}</p>
                  </div>
                  <span className={`text-xs text-gray-400 px-2 ${message.type === 'user' ? 'text-right' : ''}`}>
                    {message.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start" style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="bg-white border-2 border-purple-100 rounded-2xl px-5 py-3.5 shadow-md">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 2 && (
          <div className="px-6 py-5 border-t-2 border-purple-100 bg-gradient-to-br from-purple-50 to-white">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-purple-600" />
              <p className="text-xs font-bold text-purple-600 tracking-wide uppercase">
                Popular Questions
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickQuestion(q.text)}
                  className="group flex items-center gap-3 px-4 py-3 bg-white border-2 border-purple-100 rounded-xl text-sm text-gray-700 hover:border-purple-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${q.gradient} text-white shadow-md group-hover:scale-110 transition-transform`}>
                    {q.icon}
                  </div>
                  <span className="text-left flex-1 font-medium">{q.text}</span>
                  <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t-2 border-purple-100 p-5 bg-white">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about Podverse..."
                className="w-full px-5 py-3.5 pr-12 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 resize-none transition-all duration-200 font-medium"
                rows="1"
                style={{ maxHeight: '120px', minHeight: '52px' }}
              />
              <MessageCircle className="absolute right-4 top-4 w-5 h-5 text-purple-300" />
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim()}
              className="px-6 py-3.5 bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-xl hover:from-purple-600 hover:to-purple-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none hover:-translate-y-0.5 flex items-center gap-2 font-semibold"
            >
              <Send className="w-5 h-5" />
              Send
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-gray-500 font-medium">AI Assistant Online</p>
            </div>
            <span className="text-gray-300">•</span>
            <p className="text-xs text-gray-400">Instant responses 24/7</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default FAQChatbot;