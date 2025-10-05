import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ user }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  
  // Safety check for user prop
  if (!user) {
    return null;
  }

  const handleLogout = () => {
    window.location.href = "/logout";
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/dashboard" className="navbar-logo" onClick={closeMenu}>
          <span className="logo-icon">🌐</span>
          <span className="logo-text">RentSphere</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="navbar-menu">
          <Link 
            to="/dashboard" 
            className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon">🏠</span>
            Dashboard
          </Link>
          <Link 
            to="/rentals" 
            className={`navbar-link ${isActive('/rentals') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon">🔍</span>
            Browse Rentals
          </Link>
          <Link 
            to="/my-listings" 
            className={`navbar-link ${isActive('/my-listings') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon">📋</span>
            My Listings
          </Link>
          <Link 
            to="/create-listing" 
            className={`navbar-link ${isActive('/create-listing') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon">➕</span>
            Add Listing
          </Link>
          <Link 
            to="/my-rental-requests" 
            className={`navbar-link ${isActive('/my-rental-requests') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon">📝</span>
            My Requests
          </Link>
          <Link 
            to="/my-listing-requests" 
            className={`navbar-link ${isActive('/my-listing-requests') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon">📥</span>
            Incoming
          </Link>
          <Link 
            to="/messages" 
            className={`navbar-link ${isActive('/messages') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon">💬</span>
            Messages
          </Link>
        </div>

        {/* User Profile Section */}
        <div className="navbar-user">
          <Link to="/profile" className="user-profile" onClick={closeMenu}>
            <img 
              src={user?.profilePicture || 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000'} 
              alt="Profile" 
              className="user-avatar"
            />
            <span className="user-name">{user?.name?.split(' ')[0] || 'User'}</span>
          </Link>
          <button onClick={handleLogout} className="logout-btn">
            <span className="logout-icon">🚪</span>
            Logout
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className={`mobile-menu-toggle ${isMenuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${isMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu">
          <div className="mobile-user-info">
            <img 
              src={user?.profilePicture || 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000'} 
              alt="Profile" 
              className="mobile-user-avatar"
            />
            <div className="mobile-user-details">
              <span className="mobile-user-name">{user?.name || 'User'}</span>
              <span className="mobile-user-type">
                {user?.email ? 'Google Account' : 'Phone Account'}
              </span>
            </div>
          </div>

          <div className="mobile-nav-links">
            <Link 
              to="/dashboard" 
              className={`mobile-nav-link ${isActive('/dashboard') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <span className="nav-icon">🏠</span>
              Dashboard
            </Link>
            <Link 
              to="/rentals" 
              className={`mobile-nav-link ${isActive('/rentals') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <span className="nav-icon">🔍</span>
              Browse Rentals
            </Link>
            <Link 
              to="/my-listings" 
              className={`mobile-nav-link ${isActive('/my-listings') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <span className="nav-icon">📋</span>
              My Listings
            </Link>
            <Link 
              to="/create-listing" 
              className={`mobile-nav-link ${isActive('/create-listing') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <span className="nav-icon">➕</span>
              Add Listing
            </Link>
            <Link 
              to="/my-rental-requests" 
              className={`mobile-nav-link ${isActive('/my-rental-requests') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <span className="nav-icon">📝</span>
              My Requests
            </Link>
            <Link 
              to="/my-listing-requests" 
              className={`mobile-nav-link ${isActive('/my-listing-requests') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <span className="nav-icon">📥</span>
              Incoming Requests
            </Link>
            <Link 
              to="/messages" 
              className={`mobile-nav-link ${isActive('/messages') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <span className="nav-icon">💬</span>
              Messages
            </Link>
            <Link 
              to="/profile" 
              className={`mobile-nav-link ${isActive('/profile') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <span className="nav-icon">👤</span>
              Profile
            </Link>
          </div>

          <div className="mobile-nav-footer">
            <button onClick={handleLogout} className="mobile-logout-btn">
              <span className="logout-icon">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;