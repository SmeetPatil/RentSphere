import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './UserStatsSection.css';

const UserStatsSection = ({ user }) => {
  const [stats, setStats] = useState({
    activeListings: 0,
    unreadMessages: 0,
    totalViews: 0,
    activeRentals: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await axios.get('/api/user-stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      icon: '📋',
      value: stats.activeListings,
      label: 'Active Listings',
      link: '/my-listings',
      color: '#667eea',
      bgColor: '#eef2ff'
    },
    {
      icon: '👁️',
      value: stats.totalViews,
      label: 'Total Views',
      link: null,
      color: '#10b981',
      bgColor: '#ecfdf5'
    },
    {
      icon: '💬',
      value: stats.unreadMessages,
      label: 'Unread Messages',
      link: '/messages',
      color: '#f59e0b',
      bgColor: '#fffbeb'
    },
    {
      icon: '🔄',
      value: stats.activeRentals,
      label: 'Active Requests',
      link: '/my-rental-requests',
      color: '#ec4899',
      bgColor: '#fdf2f8'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut'
      }
    }
  };

  const hasActivity = stats.activeListings > 0 || stats.unreadMessages > 0 || stats.activeRentals > 0;

  return (
    <section className="user-stats-section">
      <h2 className="section-title">Your Dashboard</h2>
      <p className="section-subtitle">Track your activity and manage your rentals</p>

      {loading ? (
        <div className="stats-loading">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <>
          <motion.div
            className="stats-grid"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            {statCards.map((stat, index) => (
              <motion.div
                key={index}
                className="stat-card"
                variants={cardVariants}
                whileHover={{ scale: 1.05, y: -5 }}
                onClick={() => stat.link && navigate(stat.link)}
                style={{
                  cursor: stat.link ? 'pointer' : 'default'
                }}
              >
                <div className="stat-icon-wrapper" style={{ background: stat.bgColor }}>
                  <span className="stat-icon">{stat.icon}</span>
                </div>
                <div className="stat-content">
                  <div className="stat-value" style={{ color: stat.color }}>
                    {stat.value}
                  </div>
                  <div className="stat-label">{stat.label}</div>
                </div>
                {stat.link && (
                  <div className="stat-arrow">→</div>
                )}
              </motion.div>
            ))}
          </motion.div>

          {!hasActivity && (
            <motion.div
              className="no-activity-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <span className="no-activity-icon">🚀</span>
              <h3>Get Started with RentSphere</h3>
              <p>You haven not created any listings yet. Start earning by renting out your items!</p>
              <div className="quick-actions">
                <button 
                  className="action-btn primary"
                  onClick={() => navigate('/create-listing')}
                >
                  Create Your First Listing
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => navigate('/rentals')}
                >
                  Browse Rentals
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </section>
  );
};

export default UserStatsSection;
