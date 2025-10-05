import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './FeaturedRentalsCarousel.css';

const FeaturedRentalsCarousel = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeaturedListings();
  }, []);

  const fetchFeaturedListings = async () => {
    try {
      const response = await axios.get('/api/featured-rentals?limit=12');
      if (response.data.success) {
        setListings(response.data.listings);
      }
    } catch (error) {
      console.error('Error fetching featured rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (listingId) => {
    navigate(`/rental/${listingId}`);
  };

  if (loading) {
    return (
      <section className="featured-carousel-section">
        <h2 className="section-title">Featured Rentals</h2>
        <div className="carousel-loading">
          <div className="loading-spinner"></div>
          <p>Loading amazing rentals...</p>
        </div>
      </section>
    );
  }

  if (listings.length === 0) {
    return (
      <section className="featured-carousel-section">
        <h2 className="section-title">Featured Rentals</h2>
        <div className="carousel-empty">
          <span className="empty-icon">📦</span>
          <p>No listings available yet. Be the first to list an item!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="featured-carousel-section">
      <h2 className="section-title">Featured Rentals</h2>
      <p className="section-subtitle">Discover the latest items available for rent</p>
      
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={20}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        autoplay={{
          delay: 3000,
          disableOnInteraction: true,
          pauseOnMouseEnter: true
        }}
        breakpoints={{
          640: {
            slidesPerView: 2,
            spaceBetween: 20
          },
          1024: {
            slidesPerView: 3,
            spaceBetween: 25
          },
          1440: {
            slidesPerView: 4,
            spaceBetween: 30
          }
        }}
        className="featured-carousel"
      >
        {listings.map((listing) => (
          <SwiperSlide key={listing.id}>
            <div 
              className="rental-card"
              onClick={() => handleCardClick(listing.id)}
            >
              <div className="card-image-container">
                {listing.images && listing.images.length > 0 ? (
                  <img 
                    src={listing.images[0]} 
                    alt={listing.title}
                    className="card-image"
                  />
                ) : (
                  <div className="card-image-placeholder">
                    <span>📷</span>
                  </div>
                )}
                <div className="card-badge">{listing.category}</div>
              </div>
              
              <div className="card-content">
                <h3 className="card-title">{listing.title}</h3>
                <p className="card-description">
                  {listing.description?.substring(0, 80)}
                  {listing.description?.length > 80 ? '...' : ''}
                </p>
                
                <div className="card-footer">
                  <div className="card-price">
                    <span className="price-amount">₹{listing.price_per_day}</span>
                    <span className="price-period">/day</span>
                  </div>
                  <div className="card-owner">
                    <img 
                      src={listing.user_profile_picture || 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000'} 
                      alt={listing.user_name}
                      className="owner-avatar"
                    />
                    <span className="owner-name">{listing.user_name}</span>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
};

export default FeaturedRentalsCarousel;
