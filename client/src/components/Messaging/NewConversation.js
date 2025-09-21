import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();

  // Handle URL parameters for pre-selecting user and message
  useEffect(() => {
    const userId = searchParams.get('user');
    const userType = searchParams.get('type');
    const subject = searchParams.get('subject');
    const listingTitle = searchParams.get('listing');

    if (userId && userType) {
      fetchUserDetails(userId, userType);
    }

    // Set pre-filled message
    if (subject) {
      setMessage(subject);
    } else if (listingTitle) {
      setMessage(`Hi! I'm interested in renting your listing "${listingTitle}". Could we discuss the details?`);
    }
  }, [searchParams]);

  const fetchUserDetails = async (userId, userType) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/users/profile?userId=${userId}&userType=${userType}`);
      if (response.data.success) {
        setSelectedUser(response.data.user);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      setError('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

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
    setError(null);
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
        <h2>💬 New Message</h2>
        <p>Start a conversation with another user</p>
      </div>

      {!selectedUser ? (
        <div className="user-search-section">
          <div className="search-container">
            <h3>🔍 Find User</h3>
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-group">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="search-input"
                />
                <button type="submit" className="search-button" disabled={loading}>
                  {loading ? (
                    <span>🔄 Searching...</span>
                  ) : (
                    <span>🔍 Search</span>
                  )}
                </button>
              </div>
            </form>

            {error && <div className="error-message">{error}</div>}

            {searchResults.length > 0 && (
              <div className="search-results-container">
                <h4>Search Results ({searchResults.length})</h4>
                <div className="search-results-grid">
                  {searchResults.map(user => (
                    <div 
                      key={`${user.user_type}-${user.id}`} 
                      className="user-result-card"
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="user-avatar">
                        {user.profile_picture ? (
                          <img src={user.profile_picture} alt={user.name} />
                        ) : (
                          <div className="avatar-placeholder">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="user-info">
                        <h5>{user.name}</h5>
                        <p className="user-contact">
                          {user.email || user.phone}
                        </p>
                        <span className="user-type-badge">
                          {user.user_type === 'google' ? '📧 Google' : '📱 Phone'}
                        </span>
                      </div>
                      <div className="select-user-btn">
                        <span>💬 Message</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="compose-message-section">
          <div className="selected-user-card">
            <div className="user-avatar">
              {selectedUser.profile_picture ? (
                <img src={selectedUser.profile_picture} alt={selectedUser.name} />
              ) : (
                <div className="avatar-placeholder">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="user-details">
              <h4>{selectedUser.name}</h4>
              <p className="user-contact">
                {selectedUser.user_type === 'google' ? selectedUser.email : selectedUser.phone}
              </p>
              <span className="user-type-badge">
                {selectedUser.user_type === 'google' ? '📧 Google User' : '📱 Phone User'}
              </span>
            </div>
            <button 
              className="change-user-btn" 
              onClick={() => setSelectedUser(null)}
            >
              🔄 Change User
            </button>
          </div>

          <div className="message-compose-container">
            <h3>✍️ Compose Message</h3>
            <form onSubmit={handleStartConversation} className="message-form">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                className="message-textarea"
                rows={6}
              />
              {error && <div className="error-message">{error}</div>}
              <div className="form-actions">
                <button 
                  type="submit" 
                  className="send-message-btn" 
                  disabled={loading || !message.trim()}
                >
                  {loading ? '📤 Sending...' : '💬 Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewConversation;