import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import axios from 'axios';
import './NearbyRentalsMap.css';

const NearbyRentalsMap = () => {
  const [nearbyListings, setNearbyListings] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [clickedTooltip, setClickedTooltip] = useState(null); // Track clicked (persistent) tooltips
  const navigate = useNavigate();

  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(location);
          fetchNearbyListings(location);
        },
        (error) => {
          console.error('Error getting location:', error);
          const defaultLocation = { latitude: 19.0760, longitude: 72.8777 };
          setUserLocation(defaultLocation);
          fetchNearbyListings(defaultLocation);
          setError('Location access denied. Showing default area.');
        }
      );
    } else {
      const defaultLocation = { latitude: 19.0760, longitude: 72.8777 };
      setUserLocation(defaultLocation);
      fetchNearbyListings(defaultLocation);
      setError('Geolocation not supported. Showing default area.');
    }
  }, []);

  useEffect(() => {
    getUserLocation();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getUserLocation]);

  const fetchNearbyListings = async (location) => {
    try {
      const response = await axios.get('/api/nearby-rentals', {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          limit: 10
        }
      });
      
      console.log('Nearby listings response:', response.data);
      
      if (response.data.success) {
        setNearbyListings(response.data.listings);
        console.log('Set nearby listings:', response.data.listings);
      }
    } catch (error) {
      console.error('Error fetching nearby rentals:', error);
      setError('Failed to load nearby rentals');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryEmoji = (category) => {
    const emojiMap = {
      'cameras': '📷',
      'laptops': '💻',
      'gaming': '🎮',
      'audio': '🎧',
      'mobile': '📱',
      'tablets': '📱',
      'monitors': '🖥️',
      'tv': '📺',
      'projectors': '📽️',
      'drones': '🚁',
      'vr': '🥽',
      'smartwatches': '⌚',
      'speakers': '🔊',
      'headphones': '🎧',
      'controllers': '🎮',
      'microphones': '🎤',
      'default': '📦'
    };
    return emojiMap[category?.toLowerCase()] || emojiMap['default'];
  };

  const createCustomIcon = (listing) => {
    const emoji = getCategoryEmoji(listing.category);
    
    // Pure CSS pin design - simple and reliable
    const iconHtml = `
      <div class="custom-map-pin">
        <div class="pin-head">
          <span class="pin-emoji">${emoji}</span>
        </div>
        <div class="pin-tail"></div>
      </div>
    `;
    
    return L.divIcon({
      className: 'custom-pin-icon',
      html: iconHtml,
      iconSize: [40, 50],
      iconAnchor: [20, 50],
      popupAnchor: [0, -50]
    });
  };

  const handleViewListing = (listingId) => {
    navigate(`/rental/${listingId}`);
  };

  if (loading) {
    return (
      <section className="nearby-map-section">
        <h2 className="section-title">Rentals Near You</h2>
        <div className="map-loading">
          <div className="loading-spinner"></div>
          <p>Finding rentals near you...</p>
        </div>
      </section>
    );
  }

  if (!userLocation) {
    return (
      <section className="nearby-map-section">
        <h2 className="section-title">Rentals Near You</h2>
        <div className="map-error">
          <span className="error-icon">📍</span>
          <p>Unable to determine your location</p>
        </div>
      </section>
    );
  }

  return (
    <section className="nearby-map-section">
      <h2 className="section-title">Rentals Near You</h2>
      <p className="section-subtitle">
        {nearbyListings.length > 0 
          ? `Discover ${nearbyListings.length} items available nearby`
          : 'No rentals found in your area'}
      </p>
      
      {error && (
        <div className="map-notice">
          <span>ℹ️</span> {error}
        </div>
      )}

      <div className="map-container-wrapper">
        <MapContainer
          center={[userLocation.latitude, userLocation.longitude]}
          zoom={12}
          style={{ height: '500px', width: '100%' }}
          className="nearby-map"
          eventHandlers={{
            click: () => {
              // Close all tooltips when clicking on empty map area
              setActiveTooltip(null);
              setClickedTooltip(null);
            }
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <Marker 
            position={[userLocation.latitude, userLocation.longitude]}
            icon={L.divIcon({
              className: 'user-location-marker',
              html: '<div class="user-marker">📍</div>',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })}
          >
            <Popup>
              <strong>Your Location</strong>
            </Popup>
          </Marker>

          {nearbyListings.map((listing) => {
            const lat = parseFloat(listing.latitude);
            const lng = parseFloat(listing.longitude);
            
            if (isNaN(lat) || isNaN(lng)) {
              console.warn('Invalid coordinates for listing:', listing.id);
              return null;
            }
            
            return (
              <Marker
                key={listing.id}
                position={[lat, lng]}
                icon={createCustomIcon(listing)}
                eventHandlers={{
                  click: (e) => {
                    // Prevent event bubbling
                    if (e.originalEvent) {
                      e.originalEvent.stopPropagation();
                    }
                    
                    
                    // Toggle popup (stationary) on click
                    if (clickedTooltip === listing.id) {
                      setClickedTooltip(null);
                      e.target.closePopup();
                    } else {
                      setClickedTooltip(listing.id);
                      setActiveTooltip(null); // Close any hover tooltip
                      e.target.closeTooltip(); // Close hover tooltip
                      e.target.openPopup(); // Open stationary popup
                    }
                  },
                  mouseover: (e) => {
                    // Show tooltip on hover only if no popup is open
                    if (clickedTooltip !== listing.id) {
                      setActiveTooltip(listing.id);
                      e.target.openTooltip();
                    }
                  },
                  mouseout: (e) => {
                    // Hide tooltip on mouseout only if no popup is open
                    if (clickedTooltip !== listing.id) {
                      setActiveTooltip(null);
                      e.target.closeTooltip();
                    }
                  }
                }}
              >
                {/* Hover tooltip for preview */}
                <Tooltip 
                  direction={isMobile ? "top" : "right"} 
                  offset={isMobile ? [0, -30] : [15, 0]} 
                  opacity={1}
                  permanent={false}
                  interactive={false}
                >
                  <div className="rental-tooltip-content tooltip-preview">
                    {listing.images && listing.images.length > 0 ? (
                      <img 
                        src={listing.images[0]} 
                        alt={listing.title}
                        className="tooltip-img"
                      />
                    ) : (
                      <div className="tooltip-img tooltip-placeholder">
                        {getCategoryEmoji(listing.category)}
                      </div>
                    )}
                    <div className="tooltip-info">
                      <h4>{listing.title}</h4>
                      <p className="tooltip-owner">by {listing.user_name}</p>
                      <p className="tooltip-price">₹{listing.price_per_day}/day</p>
                      <p className="tooltip-hint">👆 Click pin for options</p>
                    </div>
                  </div>
                </Tooltip>

                {/* Stationary popup for clicked state */}
                <Popup 
                  closeButton={true}
                  autoClose={false}
                  closeOnEscapeKey={true}
                  className="rental-popup"
                >
                  <div className="rental-tooltip-content rental-popup-content">
                    {listing.images && listing.images.length > 0 ? (
                      <img 
                        src={listing.images[0]} 
                        alt={listing.title}
                        className="tooltip-img"
                      />
                    ) : (
                      <div className="tooltip-img tooltip-placeholder">
                        {getCategoryEmoji(listing.category)}
                      </div>
                    )}
                    <div className="tooltip-info">
                      <h4>{listing.title}</h4>
                      <p className="tooltip-owner">by {listing.user_name}</p>
                      <p className="tooltip-price">₹{listing.price_per_day}/day</p>
                      <button 
                        onClick={() => handleViewListing(listing.id)}
                        className="tooltip-view-btn"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {nearbyListings.length === 0 && (
        <div className="map-empty-state">
          <span className="empty-icon">🗺️</span>
          <p>No rentals found in your area</p>
          <button 
            className="browse-all-btn"
            onClick={() => navigate('/rentals')}
          >
            Browse All Rentals
          </button>
        </div>
      )}
    </section>
  );
};

export default NearbyRentalsMap;