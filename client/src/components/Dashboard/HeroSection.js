import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from './AnimatedBackground';
import './HeroSection.css';

const HeroSection = ({ user }) => {
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    if (hour >= 17 && hour < 22) return "Good Evening";
    return "Good Night";
  };

  return (
    <section className="hero-section">
      <AnimatedBackground />
      
      <div className="hero-content">
        <motion.div
          className="hero-text"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="hero-title">
            {getGreeting()}, {user.name.split(" ")[0]}! 👋
          </h1>
        </motion.div>

        <motion.p
          className="hero-subtitle"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Welcome to RentSphere - Your marketplace for renting anything, anytime
        </motion.p>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <button 
            className="hero-btn primary"
            onClick={() => navigate('/rentals')}
          >
            Browse Rentals
          </button>
          <button 
            className="hero-btn secondary"
            onClick={() => navigate('/create-listing')}
          >
            List Your Item
          </button>
        </motion.div>

        <motion.div
          className="hero-stats"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <div className="stat-item">
            <span className="stat-icon">🏠</span>
            <span className="stat-text">Thousands of Items</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">👥</span>
            <span className="stat-text">Trusted Community</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">⚡</span>
            <span className="stat-text">Instant Booking</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
