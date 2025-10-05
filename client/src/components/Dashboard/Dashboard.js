import React from 'react';
import HeroSection from './HeroSection';
import FeaturedRentalsCarousel from './FeaturedRentalsCarousel';
import NearbyRentalsMap from './NearbyRentalsMap';
import UserStatsSection from './UserStatsSection';
import './Dashboard.css';

const Dashboard = ({ user }) => {
  return (
    <div className="dashboard-container">
      <HeroSection user={user} />
      <FeaturedRentalsCarousel />
      <UserStatsSection user={user} />
      <NearbyRentalsMap />
    </div>
  );
};

export default Dashboard;
