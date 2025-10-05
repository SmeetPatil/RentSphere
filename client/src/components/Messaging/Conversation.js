import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './Messaging.css'; // Updated with new send button styles

const Conversation = ({ user }) => {
  const { conversationId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const messagesEndRef = useRef(null);

  // Debug user object
  console.log('Conversation component - User object:', user);

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
    <div className="messaging-page">
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
                      // Determine current user type based on available contact info
                      // Google users have email, phone users have phone as primary contact
                      const currentUserType = user?.email ? 'google' : 'phone';
                      
                      // Compare both sender_id and sender_type
                      const isCurrentUser = message.sender_id === user?.id && message.sender_type === currentUserType;
                      
                      console.log('Debug - Message ID:', message.id, 'Sender ID:', message.sender_id, 'Sender Type:', message.sender_type, 'User ID:', user?.id, 'User Type:', currentUserType, 'Is Current User:', isCurrentUser, 'Sender Name:', message.sender_name);
                      
                      const messageStyle = {
                        display: 'flex',
                        maxWidth: '60%',
                        marginBottom: '8px',
                        padding: '6px 10px',
                        borderRadius: '16px',
                        alignItems: 'flex-end',
                        alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
                        marginLeft: isCurrentUser ? 'auto' : '0',
                        marginRight: isCurrentUser ? '0' : 'auto',
                        backgroundColor: isCurrentUser ? '#007bff' : '#e9ecef',
                        color: isCurrentUser ? 'white' : '#333',
                        flexDirection: isCurrentUser ? 'row-reverse' : 'row'
                      };

                      return (
                        <div 
                          key={message.id} 
                          className={`message ${isCurrentUser ? 'sent' : 'received'}`}
                          style={messageStyle}>
                          <img 
                            src={message.sender_profile_picture || 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000'} 
                            alt={message.sender_name} 
                            className="message-avatar"
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              margin: isCurrentUser ? '0 0 0 6px' : '0 6px 0 0',
                              flexShrink: 0
                            }}
                          />
                          <div className="message-content" style={{
                            padding: '3px 6px',
                            borderRadius: '10px',
                            backgroundColor: 'transparent'
                          }}>
                            {!isCurrentUser && (
                              <div className="message-sender" style={{
                                fontWeight: '600',
                                fontSize: '12px',
                                marginBottom: '2px',
                                opacity: 0.8
                              }}>
                                {message.sender_name}
                              </div>
                            )}
                            <div className="message-text" style={{
                              lineHeight: '1.4',
                              marginBottom: '2px'
                            }}>
                              {message.message_text}
                            </div>
                            <div className="message-time" style={{
                              fontSize: '10px',
                              opacity: 0.7,
                              marginTop: '2px',
                              textAlign: isCurrentUser ? 'right' : 'left'
                            }}>
                              {new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        </div>
                      );
                    })        )}
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
        <button type="submit" className="send-button" title="Send message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </form>
      </div>
    </div>
  );
};

export default Conversation;