import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, RefreshCw, MessageCircle, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

const ChatPanel = ({ mentorId, mentee, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  useEffect(() => {
    if (mentee && mentee.contextType && mentee.contextId) {
      fetchMessages();
      // Poll for new messages every 3 seconds
      const interval = setInterval(fetchMessages, 3000);
      setPollingInterval(interval);

      return () => clearInterval(interval);
    }
  }, [mentee?.jobseekerId, mentee?.contextType, mentee?.contextId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      if (!mentee?.contextType || !mentee?.contextId) {
        setError('Mentee does not have an active context');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/chat/messages?mentorId=${mentorId}&jobseekerId=${mentee.jobseekerId}&contextType=${mentee.contextType}&contextId=${mentee.contextId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setMessages(data.data || []);
        setError(null);
      } else {
        setError(data.message || 'Failed to load messages');
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    if (!mentee?.contextType || !mentee?.contextId) {
      alert('Cannot send message: mentee does not have an active context');
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiverId: mentee.jobseekerId,
          message: newMessage.trim(),
          contextType: mentee.contextType,
          contextId: mentee.contextId
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        fetchMessages(); // Refresh immediately
      } else {
        alert(data.message || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch {
      return '';
    }
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  if (!mentee) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 400 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 400 }}
        className="fixed right-0 top-0 h-full w-full md:w-96 bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-indigo-600 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{mentee.name}</h3>
              <p className="text-xs text-indigo-100 truncate">{mentee.email}</p>
              {mentee.contextName && (
                <p className="text-xs text-indigo-200 mt-1 truncate">
                  {mentee.contextType === 'internship' ? 'Internship' : 'Project'}: {mentee.contextName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors flex-shrink-0 ml-2"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="text-sm text-gray-600">Loading messages...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Error Loading Messages</h4>
              <p className="text-xs text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchMessages}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <MessageCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">No messages yet</h4>
              <p className="text-xs text-gray-600">Start the conversation with {mentee.name}!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const senderId = msg.sender._id || msg.sender;
              const mentorIdStr = mentorId?.toString() || mentorId;
              const isMentor = senderId?.toString() === mentorIdStr;
              return (
                <motion.div
                  key={msg._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMentor ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[75%]">
                    {!isMentor && (
                      <p className="text-xs text-gray-500 mb-1 px-1">{msg.sender.name}</p>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm ${
                        isMentor
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      <p
                        className={`text-[10px] mt-1.5 ${
                          isMentor ? 'text-indigo-100' : 'text-gray-400'
                        }`}
                      >
                        {formatMessageTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-200">
          {error && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          <div className="flex items-end space-x-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none max-h-32"
              disabled={sending || !mentee?.contextType || !mentee?.contextId}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending || !mentee?.contextType || !mentee?.contextId}
              className={`p-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label="Send message"
            >
              {sending ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          {mentee.contextName && (
            <p className="text-xs text-gray-500 mt-2">
              Chatting about: <span className="font-medium">{mentee.contextName}</span>
            </p>
          )}
        </form>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChatPanel;
