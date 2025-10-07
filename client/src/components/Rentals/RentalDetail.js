import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import MapComponent from './MapComponent';
import RentalRequestForm from './RentalRequestForm';
import './Rentals.css';

// Image Gallery Component
const ImageGallery = ({ images, title, category, getDefaultImage }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Check if images exist and are valid (not empty strings)
  const validImages = images && Array.isArray(images) 
    ? images.filter(img => img && typeof img === 'string' && img.trim() !== '') 
    : [];
  
  const hasImages = validImages.length > 0;
  const displayImages = hasImages ? validImages : [getDefaultImage(category)];
  const currentImage = displayImages[currentImageIndex];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  return (
    <div className="rental-images">
      {/* Main Image */}
      <div className="main-image-container" style={{ position: 'relative' }}>
        <img 
          src={currentImage}
          alt={`${title} - View ${currentImageIndex + 1}`}
          className="main-image"
          onError={(e) => {
            console.log('Main image failed to load:', currentImage);
            e.target.src = getDefaultImage(category);
          }}
        />
        
        {/* Navigation arrows for multiple images */}
        {displayImages.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="image-nav-btn prev-btn"
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ‹
            </button>
            <button
              onClick={nextImage}
              className="image-nav-btn next-btn"
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ›
            </button>
            
            {/* Image counter */}
            <div style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {currentImageIndex + 1} / {displayImages.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Gallery */}
      {displayImages.length > 1 && (
        <div className="thumbnail-gallery" style={{
          display: 'flex',
          gap: '10px',
          marginTop: '15px',
          overflowX: 'auto',
          padding: '10px 0'
        }}>
          {displayImages.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`${title} - Thumbnail ${index + 1}`}
              className="thumbnail-image"
              onClick={() => setCurrentImageIndex(index)}
              onError={(e) => {
                e.target.src = getDefaultImage(category);
              }}
              style={{
                width: '80px',
                height: '60px',
                objectFit: 'cover',
                borderRadius: '8px',
                cursor: 'pointer',
                border: index === currentImageIndex ? '3px solid #dc2626' : '2px solid #e2e8f0',
                transition: 'all 0.3s ease',
                flexShrink: 0
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const RentalDetail = () => {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [ownerRating, setOwnerRating] = useState(null);
  const [deliveryRatings, setDeliveryRatings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showRentalForm, setShowRentalForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location obtained for rental detail:', position.coords.latitude, position.coords.longitude);
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          let errorMessage = 'Location access is required to view rental details and calculate distance.';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access was denied. Please enable location access to view rental details.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please check your connection.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please refresh the page.';
              break;
            default:
              errorMessage = 'Unable to access location. Please check your browser settings.';
              break;
          }
          
          setError(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    } else {
      setError('Geolocation is not supported by this browser');
    }
  }, []);

  const fetchRentalDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/rentals/${id}`, {
        params: {
          lat: userLocation.lat,
          lng: userLocation.lng
        }
      });

      if (response.data.success) {
        setListing(response.data.listing);
        setOwnerRating(response.data.owner_rating);
        
        // Fetch delivery ratings
        fetchDeliveryRatings();
      } else {
        setError(response.data.message || 'Failed to load rental details');
      }
    } catch (err) {
      console.error('Error fetching rental details:', err);
      setError(err.response?.data?.message || 'Failed to load rental details');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryRatings = async () => {
    try {
      const response = await axios.get(`/api/listings/${id}/delivery-ratings`);
      if (response.data.success) {
        setDeliveryRatings(response.data);
      }
    } catch (error) {
      console.error('Error fetching delivery ratings:', error);
    }
  };

  // Fetch rental details
  useEffect(() => {
    if (userLocation && id) {
      fetchRentalDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, id]);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get('/api/user');
        setCurrentUser(response.data);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  const handleRentNow = () => {
    if (!currentUser) {
      alert('Please log in to rent this item');
      return;
    }
    setShowRentalForm(true);
  };

  const handleRentalSuccess = (rentalRequest) => {
    console.log('Rental request submitted:', rentalRequest);
    setShowRentalForm(false);
  };

  const isOwnListing = currentUser && listing && 
    currentUser.id === listing.user_id && 
    (currentUser.google_id ? 'google' : 'phone') === listing.user_type;

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
      cameras: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&h=400&fit=crop',
      drones: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600&h=400&fit=crop',
      headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=400&fit=crop',
      laptops: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=400&fit=crop',
      tablets: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=400&fit=crop',
      tv: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&h=400&fit=crop',
      projectors: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop',
      speakers: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&h=400&fit=crop',
      'gaming consoles': 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600&h=400&fit=crop',
      controllers: 'https://images.unsplash.com/photo-1592840062661-eb5ad9746842?w=600&h=400&fit=crop'
    };
    
    return categoryImages[category] || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=400&fit=crop';
  };

  if (!userLocation && !error) {
    return (
      <div className="rentals-page">
        <div className="rentals-container">
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Getting your location...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rentals-page">
        <div className="rentals-container">
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading rental details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rentals-page">
        <div className="rentals-container">
          <div className="rentals-header">
            <div className="header-left">
              <h1 className="rentals-title">Rental Details</h1>
            </div>
          </div>
          <div className="error">
            <h3>Unable to Load Rental</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="rentals-page">
        <div className="rentals-container">
          <div className="error">
            <h3>Rental Not Found</h3>
            <p>The rental you're looking for doesn't exist or is no longer available.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rentals-page">
      <div className="rentals-container">
        {/* Header */}
        <div className="rentals-header">
          <div className="header-left">
            <Link to="/rentals" className="back-to-dashboard-btn">
              ← Back to Rentals
            </Link>
            <h1 className="rentals-title">Rental Details</h1>
          </div>
        </div>

        {/* Rental Details */}
        <div className="rental-detail">
          <div className="rental-detail-content">
            {/* Image Gallery */}
            <ImageGallery 
              images={listing.images} 
              title={listing.title}
              category={listing.category}
              getDefaultImage={getDefaultImage}
            />

            {/* Main Info */}
            <div className="rental-info">
              <div className="rental-header-info">
                <h2 className="rental-title">{listing.title}</h2>
                <div className="rental-price-large">
                  {formatPrice(listing.price_per_day)}/day
                </div>
              </div>

              <div className="rental-meta">
                <div className="meta-item">
                  <span className="meta-label">Category:</span>
                  <span className="meta-value">
                    {listing.category.charAt(0).toUpperCase() + listing.category.slice(1)}
                    {listing.subcategory && ` - ${listing.subcategory}`}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Location:</span>
                  <span className="meta-value">
                    📍 {formatDistance(listing.distance)} • {listing.address}
                  </span>
                </div>
              </div>

              <div className="rental-description">
                <h3>Description</h3>
                <p>{listing.description}</p>
              </div>

              {/* Location Map */}
              <div className="rental-location-map">
                <h3>Location</h3>
                <MapComponent
                  latitude={listing.latitude}
                  longitude={listing.longitude}
                  title={`${listing.title} Location`}
                  height="300px"
                  showControls={true}
                  className="detail-page-map"
                />
                <div className="location-details">
                  <p><strong>Address:</strong> {listing.address}</p>
                  <p><strong>Distance:</strong> {formatDistance(listing.distance)} from your location</p>
                </div>
              </div>

              {/* Specifications */}
              {listing.specifications && Object.keys(listing.specifications).length > 0 && (
                <div className="rental-specifications">
                  <h3>Specifications</h3>
                  <div className="specs-grid">
                    {Object.entries(listing.specifications).map(([key, value]) => (
                      <div key={key} className="spec-item">
                        <span className="spec-label">
                          {key.replace(/_/g, ' ').toUpperCase()}:
                        </span>
                        <span className="spec-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Owner Info Sidebar */}
          <div className="owner-sidebar">
            <div className="owner-card">
              <h3>Rental Owner</h3>
              <div className="owner-info">
                <img 
                  src={listing.owner_profile_picture || 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000'}
                  alt={listing.owner_name}
                  className="owner-avatar-large"
                />
                <div className="owner-details">
                  <div className="owner-name">{listing.owner_name}</div>
                  <div className="owner-rating">
                    {ownerRating && ownerRating.average > 0 ? (
                      <>
                        <span className="rating-stars">
                          {renderStars(ownerRating.average)}
                        </span>
                        <span className="rating-text">
                          {ownerRating.average.toFixed(1)} ({ownerRating.total} reviews)
                        </span>
                      </>
                    ) : (
                      <span className="no-rating">New seller</span>
                    )}
                  </div>
                  <div className="owner-since">
                    Member since {new Date(listing.owner_member_since).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short'
                    })}
                  </div>
                </div>
              </div>

              <div className="contact-actions">
                {!isOwnListing && (
                  <button 
                    onClick={handleRentNow}
                    className="contact-btn primary rent-now-btn"
                    style={{ marginBottom: '12px' }}
                  >
                    🚀 Rent Now
                  </button>
                )}
                <Link 
                  to={`/messages/new?user=${listing.user_id}&type=${listing.user_type}&listing=${encodeURIComponent(listing.title)}`}
                  className="contact-btn secondary"
                >
                  💬 Message Owner
                </Link>
                <div className="contact-info">
                  <small>
                    {!isOwnListing 
                      ? "Rent instantly or contact the owner to discuss rental details" 
                      : "This is your listing"}
                  </small>
                </div>
              </div>
            </div>

            {/* Reviews */}
            {ownerRating && ownerRating.reviews && ownerRating.reviews.length > 0 && (
              <div className="reviews-section">
                <h3>Recent Reviews</h3>
                <div className="reviews-list">
                  {ownerRating.reviews.slice(0, 3).map((review, index) => (
                    <div key={index} className="review-item">
                      <div className="review-header">
                        <span className="reviewer-name">{review.reviewer_name}</span>
                        <span className="review-rating">
                          {renderStars(review.rating)}
                        </span>
                      </div>
                      {review.review && (
                        <p className="review-text">{review.review}</p>
                      )}
                      <div className="review-date">
                        {new Date(review.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery Ratings */}
            {deliveryRatings && deliveryRatings.summary.totalRatings > 0 && (
              <div className="delivery-ratings-section">
                <h3>🚚 Delivery Ratings</h3>
                
                {/* Ratings Summary */}
                <div className="delivery-rating-summary">
                  <div className="overall-rating">
                    <div className="rating-value">{deliveryRatings.summary.overallAvgRating}</div>
                    <div className="rating-stars">
                      {renderStars(Math.round(parseFloat(deliveryRatings.summary.overallAvgRating)))}
                    </div>
                    <div className="rating-count">{deliveryRatings.summary.totalRatings} deliveries</div>
                  </div>
                  
                  <div className="rating-breakdown">
                    <div className="breakdown-item">
                      <span className="breakdown-label">Delivery Speed</span>
                      <div className="breakdown-bar">
                        <div 
                          className="breakdown-fill" 
                          style={{width: `${(deliveryRatings.summary.avgDeliveryRating / 5) * 100}%`}}
                        ></div>
                      </div>
                      <span className="breakdown-value">{deliveryRatings.summary.avgDeliveryRating}</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Item Condition</span>
                      <div className="breakdown-bar">
                        <div 
                          className="breakdown-fill" 
                          style={{width: `${(deliveryRatings.summary.avgItemConditionRating / 5) * 100}%`}}
                        ></div>
                      </div>
                      <span className="breakdown-value">{deliveryRatings.summary.avgItemConditionRating}</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Communication</span>
                      <div className="breakdown-bar">
                        <div 
                          className="breakdown-fill" 
                          style={{width: `${(deliveryRatings.summary.avgCommunicationRating / 5) * 100}%`}}
                        ></div>
                      </div>
                      <span className="breakdown-value">{deliveryRatings.summary.avgCommunicationRating}</span>
                    </div>
                  </div>
                </div>
                
                {/* Individual Ratings */}
                <div className="delivery-ratings-list">
                  {deliveryRatings.ratings.slice(0, 5).map((rating) => (
                    <div key={rating.id} className="delivery-rating-item">
                      <div className="rating-header">
                        <img 
                          src={rating.rater_picture || 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000'}
                          alt={rating.rater_name}
                          className="rater-avatar"
                        />
                        <div className="rater-info">
                          <div className="rater-name">{rating.rater_name}</div>
                          <div className="rating-stars-small">
                            {renderStars(Math.round(rating.avg_rating))}
                            <span className="rating-value-small">{rating.avg_rating.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="rating-date">
                          {new Date(rating.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                      
                      {rating.comment && (
                        <p className="rating-comment">{rating.comment}</p>
                      )}
                      
                      <div className="rating-details">
                        <span className="rating-detail-item">
                          🚀 Delivery: {rating.delivery_rating}/5
                        </span>
                        <span className="rating-detail-item">
                          📦 Condition: {rating.item_condition_rating}/5
                        </span>
                        <span className="rating-detail-item">
                          💬 Communication: {rating.communication_rating}/5
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rental Request Form Modal */}
      {showRentalForm && listing && (
        <RentalRequestForm
          listing={listing}
          onClose={() => setShowRentalForm(false)}
          onSuccess={handleRentalSuccess}
        />
      )}
    </div>
  );
};

export default RentalDetail;