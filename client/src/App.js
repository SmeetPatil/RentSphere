import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Configure axios defaults
axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/api/user');
      setUser(response.data);
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" /> : <LoginPage />} 
          />
          <Route 
            path="/phone" 
            element={user ? <Navigate to="/dashboard" /> : <PhoneLoginPage />} 
          />
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/profile" 
            element={user ? <Profile user={user} setUser={setUser} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/" 
            element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

// Login Page Component (using original design)
function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="logo">🌐 RentSphere</div>
        <div className="tagline">Your Gateway to Perfect Tech Rentals</div>

        <div className="welcome-text">Welcome!</div>
        <div className="description">
          Sign in with your Google account to access thousands of rental tech items straight from users and fulfill your needs.
        </div>

        <a href="/google" className="google-login-btn">
          <svg className="google-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </a>
        <br />
        <a href="/phone" className="phone-login-btn">
          <svg className="google-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M17 1H7C5.34 1 4 2.34 4 4v16c0 1.66 1.34 3 3 3h10c1.66 0 3-1.34 3-3V4c0-1.66-1.34-3-3-3zm-5 20c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm5-6H7V4h10v11z"/>
          </svg>
          Continue with Phone
        </a>

        <div className="features">
          <h3>Why Choose RentSphere?</h3>
          <ul className="feature-list">
            <li>Browse thousands of verified rentals</li>
            <li>Direct contact with renters</li>
            <li>Advanced search and filtering</li>
            <li>Save your favorite listings</li>
            <li>Get instant notifications</li>
          </ul>
        </div>

        <div className="footer">
          Secure login powered by Google OAuth
        </div>
      </div>
    </div>
  );
}

// Phone Login Page Component  
function PhoneLoginPage() {
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>📱 Phone Login</h1>
        <p>This feature is still being migrated to React.</p>
        <p>For now, please use <a href="/phone">the original phone login</a>.</p>
        <a href="/login" className="back-btn">← Back to Login</a>
      </div>
    </div>
  );
}

// Dashboard Component
function Dashboard({ user }) {
  const handleLogout = () => {
    window.location.href = '/logout';
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🌐 RentSphere Dashboard</h1>
        <div className="user-info">
          <img src={user.profilePicture} alt="Profile" className="profile-pic" />
          <span>Welcome, {user.name}!</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>
      
      <main className="dashboard-content">
        <div className="dashboard-card">
          <h2>Welcome to RentSphere!</h2>
          <p>Your account is set up and ready to go.</p>
          <a href="/profile" className="profile-link">Manage Profile →</a>
        </div>
      </main>
    </div>
  );
}

// Profile Component
function Profile({ user, setUser }) {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.put('/api/user/update', {
        name,
        email: email || undefined,
        phone: phone || undefined
      });

      if (response.data.success) {
        setUser(response.data.user);
        setMessage('Profile updated successfully!');
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h1>👤 Profile Settings</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {!user.email && (
            <div className="form-group">
              <label>Email Address (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Add your email address"
              />
            </div>
          )}

          {!user.phone && (
            <div className="form-group">
              <label>Phone Number (Optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Add your phone number"
              />
            </div>
          )}

          <button type="submit" disabled={loading} className="save-btn">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <a href="/dashboard" className="back-btn">← Back to Dashboard</a>
      </div>
    </div>
  );
}

export default App;