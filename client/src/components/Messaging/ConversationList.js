import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Messaging.css';

const ConversationList = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/conversations');
        if (response.data.success) {
          setConversations(response.data.conversations);
        } else {
          setError('Failed to load conversations');
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading">Loading conversations...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="conversation-list">
      <div className="conversation-list-header">
        <h2>Messages</h2>
        <Link to="/messages/new" className="new-message-btn">New Message</Link>
      </div>
      
      {conversations.length === 0 ? (
        <div className="no-conversations">
          <p>You don't have any conversations yet.</p>
          <Link to="/messages/new" className="start-conversation-btn">Start a conversation</Link>
        </div>
      ) : (
        <ul>
          {conversations.map(conversation => (
            <li key={conversation.id}>
              <Link to={`/messages/${conversation.id}`} className="conversation-item">
                <div className="conversation-avatar">
                  <img 
                    src={conversation.otherUser?.profile_picture || 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000'} 
                    alt={conversation.otherUser?.name || 'User'} 
                  />
                </div>
                <div className="conversation-details">
                  <div className="conversation-name">{conversation.otherUser?.name || 'Unknown User'}</div>
                  <div className="conversation-last-message">{conversation.lastMessage || 'No messages yet'}</div>
                </div>
                <div className="conversation-time">
                  {conversation.lastMessageTime ? new Date(conversation.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ConversationList;