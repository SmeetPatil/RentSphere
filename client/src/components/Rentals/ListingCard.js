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

  const getDefaultImage = (category) => {
    const categoryImages = {
      cameras: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&h=200&fit=crop',
      drones: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=300&h=200&fit=crop',
      headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop',
      laptops: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=200&fit=crop',
      tablets: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&h=200&fit=crop',
      tv: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=300&h=200&fit=crop',
      projectors: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop',
      speakers: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&h=200&fit=crop',
      'gaming consoles': 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=300&h=200&fit=crop',
      controllers: 'https://images.unsplash.com/photo-1592840062661-eb5ad9746842?w=300&h=200&fit=crop'
    };
    
    return categoryImages[category] || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop';
  };

  const getImageSrc = () => {
    if (listing.images && listing.images.length > 0) {
      return listing.images[0];
    }
    return getDefaultImage(listing.category);
  };

  return (
    <Link to={`/rental/${listing.id}`} className="listing-card">
      <div className="listing-image-container" style={{ position: 'relative' }}>
        <img 
          src={getImageSrc()}
          alt={listing.title}
          className="listing-image"
          onError={(e) => {
            e.target.src = getDefaultImage(listing.category);
          }}
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
            <div className="owner-name">{listing.owner_name}</div>
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