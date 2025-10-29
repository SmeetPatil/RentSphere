import React from 'react';
import { Link } from 'react-router-dom';
import MapComponent from './MapComponent';

const ListingCard = ({ listing }) => {
  const formatPrice = (price) => {
    return `₹${parseFloat(price).toFixed(0)}`;
  };

  const formatDistance = (distance) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m away`;
    }
    return `${distance.toFixed(1)}km away`;
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push('⭐');
    }
    if (hasHalfStar) {
      stars.push('⭐');
    }
    
    return stars.join('');
  };

  // Only show listings with images - no placeholders
  if (!listing.images || listing.images.length === 0) {
    return null;
  }

  return (
    <Link to={`/rental/${listing.id}`} className="listing-card">
      <div className="listing-image-container" style={{ position: 'relative' }}>
        <img 
          src={listing.images[0]}
          alt={listing.title}
          className="listing-image"
        />
        {/* Image count indicator */}
        {listing.images && listing.images.length > 1 && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            📸 {listing.images.length}
          </div>
        )}
      </div>
      
      <div className="listing-content">
        <h3 className="listing-title">{listing.title}</h3>
        
        <div className="listing-price">
          {formatPrice(listing.price_per_day)}/day
        </div>
        
        <div className="listing-location">
          📍 {formatDistance(listing.distance)}
        </div>
        
        {/* Map showing listing location */}
        <div className="listing-map">
          <MapComponent
            latitude={listing.latitude}
            longitude={listing.longitude}
            title={listing.title}
            height="150px"
            className="rental-card-map"
          />
        </div>
        
        <div className="listing-owner">
          <img 
            src={listing.owner_profile_picture || 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000'}
            alt={listing.owner_name}
            className="owner-avatar"
          />
          <div className="owner-info">
            <div className="owner-name">
              {listing.owner_name}
              {listing.owner_kyc_verified && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginLeft:'0.35rem',verticalAlign:'middle',display:'inline-block'}} title="Verified User">
                  <circle cx="12" cy="12" r="10" fill="#10b981"/>
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <div className="owner-rating">
              <span className="rating-stars">
                {parseFloat(listing.owner_rating) > 0 ? renderStars(parseFloat(listing.owner_rating)) : '⭐'}
              </span>
              <span>
                {parseFloat(listing.owner_rating) > 0 
                  ? `${parseFloat(listing.owner_rating).toFixed(1)} (${listing.rating_count})`
                  : 'New seller'
                }
              </span>
            </div>
          </div>
        </div>
        
        {/* Delivery Rating Badge */}
        {listing.delivery_rating_count > 0 && (
          <div className="delivery-rating-badge">
            <span className="delivery-icon">🚚</span>
            <span className="rating-stars">
              {renderStars(Math.round((parseFloat(listing.avg_delivery_rating) + parseFloat(listing.avg_item_condition_rating) + parseFloat(listing.avg_communication_rating)) / 3))}
            </span>
            <span className="rating-value">
              {((parseFloat(listing.avg_delivery_rating) + parseFloat(listing.avg_item_condition_rating) + parseFloat(listing.avg_communication_rating)) / 3).toFixed(1)}
            </span>
            <span className="rating-count">
              ({listing.delivery_rating_count} deliveries)
            </span>
          </div>
        )}
        
        {listing.description && (
          <div className="listing-description" style={{
            fontSize: '14px',
            color: '#666',
            marginTop: '10px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {listing.description}
          </div>
        )}
      </div>
    </Link>
  );
};

export default ListingCard;