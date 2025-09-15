import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './Messaging.css';

const Conversation = () => {
  const { conversationId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/conversations/${conversationId}/messages`);
        if (response.data.success) {
          setMessages(response.data.messages);
          
          // Get conversation details to show the other user
          const convResponse = await axios.get('/api/conversations');
          if (convResponse.data.success) {
            const conversation = convResponse.data.conversations.find(
              c => c.id === parseInt(conversationId)
            );
            if (conversation) {
              setOtherUser(conversation.otherUser);
            }
          }
        } else {
          setError('Failed to load messages');
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post(`/api/conversations/${conversationId}/messages`, {
        messageText: newMessage
      });

      if (response.data.success) {
        setMessages([...messages, response.data.message]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    }
  };

  if (loading && messages.length === 0) return <div className="loading">Loading conversation...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="conversation">
      <div className="conversation-header">
        <Link to="/messages" className="back-button">←</Link>
        <div className="conversation-user">
          <img 
            src={otherUser?.profile_picture || 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000'} 
            alt={otherUser?.name || 'User'} 
            className="user-avatar"
          />
          <span className="user-name">{otherUser?.name || 'Loading...'}</span>
        </div>
      </div>

      <div className="message-list">
        {messages.length === 0 ? (
          <div className="no-messages">No messages yet. Start the conversation!</div>
        ) : (
          messages.map(message => {
            const isCurrentUser = message.sender_id === (window.user?.id);
            return (
              <div 
                key={message.id} 
                className={`message ${isCurrentUser ? 'sent' : 'received'}`}
              >
                <div className="message-content">{message.message_text}</div>
                <div className="message-time">
                  {new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="message-input"
        />
        <button type="submit" className="send-button">Send</button>
      </form>
    </div>
  );
};

export default Conversation;