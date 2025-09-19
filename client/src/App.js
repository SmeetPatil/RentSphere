import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import axios from "axios";
import "./App.css";

import ConversationList from './components/Messaging/ConversationList';
import Conversation from './components/Messaging/Conversation';
import NewConversation from './components/Messaging/NewConversation';
import RentalBrowse from './components/Rentals/RentalBrowse';
import CreateListing from './components/Rentals/CreateListing';
import MyListings from './components/Rentals/MyListings';
import RentalDetail from './components/Rentals/RentalDetail';
import EditListing from './components/Rentals/EditListing';

// Configure axios defaults
axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Update page title based on current route
  useEffect(() => {
    const updateTitle = () => {
      const path = window.location.pathname;
      let title = 'RentSphere - Your Gateway to Perfect Tech Rentals';

      switch (path) {
        case '/login':
          title = 'Login - RentSphere';
          break;
        case '/dashboard':
          title = 'Dashboard - RentSphere';
          break;
        case '/profile':
          title = 'Profile - RentSphere';
          break;
        case '/phone':
          title = 'Phone Login - RentSphere';
          break;
        default:
          title = 'RentSphere - Your Gateway to Perfect Tech Rentals';
      }

      document.title = title;
    };

    updateTitle();

    // Listen for route changes
    window.addEventListener('popstate', updateTitle);
    return () => window.removeEventListener('popstate', updateTitle);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get("/api/user");
      setUser(response.data);
    } catch (error) {
      console.log("Not authenticated");
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
            element={
              user ? <Dashboard user={user} /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/profile"
            element={
              user ? (
                <Profile user={user} setUser={setUser} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/"
            element={
              user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
            }
          />

          {/* Messaging routes */}
          <Route path="/messages" element={user ? <ConversationList /> : <Navigate to="/login" />} />
          <Route path="/messages/:conversationId" element={user ? <Conversation user={user} /> : <Navigate to="/login" />} />
          <Route path="/messages/new" element={user ? <NewConversation /> : <Navigate to="/login" />} />

          {/* Rental routes */}
          <Route path="/rentals" element={user ? <RentalBrowse /> : <Navigate to="/login" />} />
          <Route path="/rentals/:category" element={user ? <RentalBrowse /> : <Navigate to="/login" />} />
          <Route path="/rental/:id" element={user ? <RentalDetail /> : <Navigate to="/login" />} />
          <Route path="/create-listing" element={user ? <CreateListing /> : <Navigate to="/login" />} />
          <Route path="/edit-listing/:id" element={user ? <EditListing /> : <Navigate to="/login" />} />
          <Route path="/my-listings" element={user ? <MyListings /> : <Navigate to="/login" />} />
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
          Sign in with your Google account to access thousands of rental tech
          items straight from users and fulfill your needs.
        </div>

        <a href="/google" className="google-login-btn">
          <svg className="google-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </a>
        <br />
        <a href="/phone" className="phone-login-btn">
          <svg className="google-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M17 1H7C5.34 1 4 2.34 4 4v16c0 1.66 1.34 3 3 3h10c1.66 0 3-1.34 3-3V4c0-1.66-1.34-3-3-3zm-5 20c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm5-6H7V4h10v11z"
            />
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

        <div className="footer">Secure login powered by Google OAuth</div>
      </div>
    </div>
  );
}

// Phone Login Page Component
function PhoneLoginPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullPhoneNumber, setFullPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const sendOTP = async () => {
    if (!phoneNumber || phoneNumber.length !== 10 || !/^\d+$/.test(phoneNumber)) {
      showError('Please enter a valid 10-digit phone number');
      return;
    }

    setFullPhoneNumber('+91' + phoneNumber);
    setLoading(true);

    try {
      const response = await fetch('/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: phoneNumber })
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('OTP sent successfully!');
        setCurrentStep(2);
        setTimeLeft(120);
        setTimerActive(true);
      } else {
        showError(result.message || 'Failed to send OTP');
      }
    } catch (error) {
      showError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otpCode || otpCode.length !== 4 || !/^\d+$/.test(otpCode)) {
      showError('Please enter a valid 4-digit OTP');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: phoneNumber,
          otp: otpCode
        })
      });

      const result = await response.json();

      if (result.success) {
        setTimerActive(false);
        if (result.isNewUser) {
          setCurrentStep(3);
        } else {
          showSuccess('Login successful! Redirecting...');
          setTimeout(() => window.location.href = '/dashboard', 1500);
        }
      } else {
        showError(result.message || 'Invalid OTP');
      }
    } catch (error) {
      showError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    if (!userName || userName.length < 2) {
      showError('Please enter your full name');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/complete-phone-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: fullPhoneNumber,
          name: userName
        })
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Registration complete! Redirecting...');
        setTimeout(() => window.location.href = '/dashboard', 1500);
      } else {
        showError(result.message || 'Registration failed');
      }
    } catch (error) {
      showError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = () => {
    setCurrentStep(1);
    setOtpCode('');
    setTimerActive(false);
    setTimeLeft(0);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (currentStep === 1) sendOTP();
      else if (currentStep === 2) verifyOTP();
      else if (currentStep === 3) completeRegistration();
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="logo">🌐 RentSphere</div>
        <div className="tagline">Sign in with your phone number</div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          {[1, 2, 3].map(step => (
            <div
              key={step}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: step < currentStep ? '#48bb78' : step === currentStep ? '#dc2626' : '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 0.5rem',
                fontWeight: 'bold',
                color: step <= currentStep ? 'white' : '#666'
              }}
            >
              {step}
            </div>
          ))}
        </div>

        {/* Step 1: Phone Number */}
        {currentStep === 1 && (
          <div>
            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                Enter your phone number
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value="+91"
                  readOnly
                  style={{
                    background: '#f7fafc',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '16px',
                    width: '80px',
                    textAlign: 'center'
                  }}
                />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter 10-digit number"
                  maxLength="10"
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#dc2626'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            </div>
            <button
              onClick={sendOTP}
              disabled={loading}
              className="google-login-btn"
              style={{ marginBottom: '1rem' }}
            >
              {loading ? (
                <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #ffffff', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 1s ease-in-out infinite' }}></div>
              ) : (
                'Send OTP'
              )}
            </button>
          </div>
        )}

        {/* Step 2: OTP Verification */}
        {currentStep === 2 && (
          <div>
            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                Enter OTP
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="4-digit OTP"
                maxLength="4"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#dc2626'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            {timerActive && (
              <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Resend OTP in {formatTime(timeLeft)}
              </div>
            )}
            <button
              onClick={verifyOTP}
              disabled={loading}
              className="google-login-btn"
              style={{ marginBottom: '1rem' }}
            >
              {loading ? (
                <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #ffffff', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 1s ease-in-out infinite' }}></div>
              ) : (
                'Verify OTP'
              )}
            </button>
            <button
              onClick={resendOTP}
              disabled={timerActive}
              className="phone-login-btn"
            >
              Resend OTP
            </button>
          </div>
        )}

        {/* Step 3: Name Input */}
        {currentStep === 3 && (
          <div>
            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                Enter your name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Your full name"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#dc2626'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <button
              onClick={completeRegistration}
              disabled={loading}
              className="google-login-btn"
              style={{ marginBottom: '1rem' }}
            >
              {loading ? (
                <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #ffffff', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 1s ease-in-out infinite' }}></div>
              ) : (
                'Complete Registration'
              )}
            </button>
          </div>
        )}

        {/* Error and Success Messages */}
        {error && (
          <div style={{
            background: '#fed7d7',
            color: '#c53030',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: '#c6f6d5',
            color: '#2f855a',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {success}
          </div>
        )}

        <div className="footer" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid rgba(255, 255, 255, 0.3)' }}>
          <a href="/login" style={{ color: '#dc2626', textDecoration: 'none' }}>
            ← Back to login options
          </a>
        </div>
      </div>
    </div>
  );
}

// Enhanced Dashboard Component
function Dashboard({ user }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    window.location.href = "/logout";
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getMembershipDuration = () => {
    if (!user.memberSince) return "New Member";
    const memberDate = new Date(user.memberSince);
    const now = new Date();
    const diffTime = Math.abs(now - memberDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
    return `${Math.floor(diffDays / 365)} years`;
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🌐 RentSphere</h1>
          <span className="current-time">
            {currentTime.toLocaleTimeString()}
          </span>
        </div>
        <div className="user-info">
          <a href="/profile" className="profile-link-header">
            <img
              src={user.profilePicture}
              alt="Profile"
              className="profile-pic"
            />
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-type">
                {user.email ? "Google Account" : "Phone Account"}
              </span>
            </div>
          </a>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Welcome Section */}
        <section className="welcome-section">
          <div className="welcome-card">
            <h2>
              {getGreeting()}, {user.name.split(" ")[0]}! 👋
            </h2>
            <p>
              Welcome back to your RentSphere dashboard. Ready to explore some
              amazing rentals?
            </p>
          </div>
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-info">
                <span className="stat-value">{getMembershipDuration()}</span>
                <span className="stat-label">Member Since</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏠</div>
              <div className="stat-info">
                <span className="stat-value">0</span>
                <span className="stat-label">Listings</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">❤️</div>
              <div className="stat-info">
                <span className="stat-value">0</span>
                <span className="stat-label">Favorites</span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-grid">
            <div className="action-card">
              <div className="action-icon">🔍</div>
              <h4>Browse Rentals</h4>
              <p>Discover amazing tech rentals in your area</p>
              <a href="/rentals" className="action-btn active">
                Browse Now
              </a>
            </div>
            <div className="action-card">
              <div className="action-icon">📝</div>
              <h4>List Your Item</h4>
              <p>Rent out your tech items and earn money</p>
              <a href="/create-listing" className="action-btn active">
                Create Listing
              </a>
            </div>

            <div className="action-card">
              <div className="action-icon">💬</div>
              <h4>Messages</h4>
              <p>Chat with other users</p>
              <a href="/messages" className="action-btn active">
                Open Messages
              </a>
            </div>
            <div className="action-card">
              <div className="action-icon">📋</div>
              <h4>My Listings</h4>
              <p>Manage your rental listings</p>
              <a href="/my-listings" className="action-btn active">
                View Listings
              </a>
            </div>
          </div>
        </section>

        {/* Account Overview - Only show if profile is incomplete */}
        {!(user.email && user.phone) && (
          <section className="account-overview">
            <h3>Account Overview</h3>
            <div className="overview-grid">
              <div className="overview-card">
                <h4>Profile Completion</h4>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${user.email || user.phone ? "75%" : "50%"}`,
                    }}
                  ></div>
                </div>
                <p>Add more info to improve your profile</p>
                <a href="/profile" className="complete-profile-btn">
                  Complete Profile →
                </a>
              </div>
            </div>
          </section>
        )}

        {/* Recent Activity */}
        <section className="recent-activity">
          <h3>Recent Activity</h3>
          <div className="activity-card">
            <div className="activity-item">
              <div className="activity-icon">🎉</div>
              <div className="activity-content">
                <p>
                  <strong>Welcome to RentSphere!</strong>
                </p>
                <p>
                  Your account has been successfully created. Start exploring
                  rentals now!
                </p>
                <span className="activity-time">Just now</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Enhanced Profile Component (matching original design)
function Profile({ user, setUser }) {
  const [editingSection, setEditingSection] = useState(null);
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const getMembershipDuration = () => {
    if (!user.memberSince) return "New Member";
    const memberDate = new Date(user.memberSince);
    const now = new Date();
    const diffTime = Math.abs(now - memberDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const toggleEdit = (section) => {
    if (editingSection === section) {
      setEditingSection(null);
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    } else {
      setEditingSection(section);
      setMessage("");
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage("");

    try {
      const updateData = {
        name: formData.name,
      };

      // Add email if phone user is adding it
      if (!user.email && formData.email) {
        updateData.email = formData.email;
      }

      // Add phone if Google user is adding it
      if (!user.phone && formData.phone) {
        updateData.phone = formData.phone;
      }

      const response = await axios.put("/api/user/update", updateData);

      if (response.data.success) {
        setUser(response.data.user);
        setEditingSection(null);
        setMessage("Profile updated successfully!");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <header className="profile-header-nav">
        <nav className="nav-container">
          <div className="logo">🌐 RentSphere</div>
          <a href="/dashboard" className="back-btn">
            ← Back to Dashboard
          </a>
        </nav>
      </header>

      <main className="profile-main-content">
        <div className="profile-card">
          <div className="profile-header-section">
            <img
              src={user.profilePicture}
              alt="Profile"
              className="profile-avatar"
            />
            <div className="profile-info">
              <h1>{user.name}</h1>
              <p>{user.email || user.phone}</p>
              <p className="member-since">
                Member since {getMembershipDuration()}
              </p>
            </div>
          </div>

          <div className="profile-details">
            <div className="detail-section">
              <h3>
                Personal Information
                <button
                  className="btn btn-small"
                  onClick={() => toggleEdit("personal")}
                >
                  {editingSection === "personal" ? "Cancel" : "Edit"}
                </button>
              </h3>

              {editingSection === "personal" ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label htmlFor="editName">Full Name</label>
                    <input
                      type="text"
                      id="editName"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      required
                    />
                  </div>

                  {!user.email && (
                    <div className="form-group">
                      <label htmlFor="editEmail">Email Address</label>
                      <input
                        type="email"
                        id="editEmail"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        placeholder="Add your email address"
                      />
                      <small>Adding an email helps with account recovery</small>
                    </div>
                  )}

                  {!user.phone && (
                    <div className="form-group">
                      <label htmlFor="editPhone">Phone Number</label>
                      <input
                        type="tel"
                        id="editPhone"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        placeholder="Add your phone number"
                      />
                      <small>
                        Adding a phone number helps with account security
                      </small>
                    </div>
                  )}

                  <div className="form-actions">
                    <button
                      className="btn"
                      onClick={handleSave}
                      disabled={loading}
                    >
                      {loading ? "Saving..." : "Save"}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => toggleEdit("personal")}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="personal-view">
                  <div className="detail-item">
                    <span className="detail-label">Full Name</span>
                    <span className="detail-value">
                      {user.name || "Not provided"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">
                      {user.email || "Not provided"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">
                      {user.phone || "Not provided"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="detail-section">
              <h3>Account Details</h3>
              <div className="detail-item">
                <span className="detail-label">User ID</span>
                <span className="detail-value">{user.id}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Account Type</span>
                <span className="detail-value">
                  {user.email ? "Google Account" : "Phone Account"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Member Since</span>
                <span className="detail-value">
                  {user.memberSince
                    ? new Date(user.memberSince).toLocaleDateString()
                    : "Not available"}
                </span>
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`profile-message ${message.includes("success") ? "success" : "error"
                }`}
            >
              {message}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;