import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Messaging.css';

const NewConversation = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim().length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/users/search?query=${searchQuery}`);
      if (response.data.success) {
        setSearchResults(response.data.users);
        if (response.data.users.length === 0) {
          setError('No users found matching your search');
        }
      } else {
        setError('Failed to search users');
      }
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSearchResults([]);
  };

  const handleStartConversation = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Please select a user to message');
      return;
    }

    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/conversations', {
        recipientId: selectedUser.id,
        recipientType: selectedUser.user_type,
        initialMessage: message
      });

      if (response.data.success) {
        navigate(`/messages/${response.data.conversation.id}`);
      } else {
        setError('Failed to start conversation');
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
      setError('Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-conversation">
      <div className="new-conversation-header">
        <h2>New Message</h2>
      </div>

      {!selectedUser ? (
        <div className="user-search">
          <form onSubmit={handleSearch}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a user..."
              className="search-input"
            />
            <button type="submit" className="search-button" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {error && <div className="error">{error}</div>}

          {searchResults.length > 0 && (
            <ul className="search-results">
              {searchResults.map(user => (
                <li key={`${user.user_type}-${user.id}`} onClick={() => handleUserSelect(user)}>
                  <div className="user-avatar">
                    <img 
                      src={user.profile_picture || 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000'} 
                      alt={user.name} 
                    />
                  </div>
                  <div className="user-details">
                    <div className="user-name">{user.name}</div>
                    <div className="user-contact">
                      {user.user_type === 'google' ? user.email : user.phone}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="compose-message">
          <div className="selected-user">
            <div className="user-avatar">
              <img 
                src={selectedUser.profile_picture || 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000'} 
                alt={selectedUser.name} 
              />
            </div>
            <div className="user-details">
              <div className="user-name">{selectedUser.name}</div>
              <div className="user-contact">
                {selectedUser.user_type === 'google' ? selectedUser.email : selectedUser.phone}
              </div>
            </div>
            <button 
              className="change-user-btn" 
              onClick={() => setSelectedUser(null)}
            >
              Change
            </button>
          </div>

          <form onSubmit={handleStartConversation}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="message-textarea"
              rows={4}
            />
            {error && <div className="error">{error}</div>}
            <button 
              type="submit" 
              className="send-button" 
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default NewConversation;