/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import CategoryGrid from './CategoryGrid';
import ListingCard from './ListingCard';
import './Rentals.css';

const RentalBrowse = () => {
  const { category } = useParams();
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(category || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  // Get user location
  useEffect(() => {
    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Location obtained:', position.coords.latitude, position.coords.longitude);
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            setError(null); // Clear any previous errors
          },
          (error) => {
            console.error('Geolocation error:', error);
            let errorMessage = 'Location access is required to browse rentals in your area (15km radius).';
            
            switch(error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Location access was denied. Please enable location access in your browser settings and refresh the page.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information is unavailable. Please check your internet connection and try again.';
                break;
              case error.TIMEOUT:
                errorMessage = 'Location request timed out. Please try again.';
                break;
              default:
                errorMessage = 'An unknown error occurred while retrieving your location. Please try again.';
                break;
            }
            
            setError(errorMessage);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      } else {
        setError('Geolocation is not supported by this browser. Please use a modern browser to access rental listings.');
      }
    };

    getLocation();
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/categories');
        if (response.data.success) {
          setCategories(response.data.categories);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        lat: userLocation.lat,
        lng: userLocation.lng
      };

      if (selectedCategory) params.category = selectedCategory;
      if (selectedSubcategory) params.subcategory = selectedSubcategory;

      const response = await axios.get('/api/rentals', { params });
      
      if (response.data.success) {
        setListings(response.data.listings);
      } else {
        setError('Failed to load listings');
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [userLocation, selectedCategory, selectedSubcategory]);

  // Fetch listings when location or filters change
  useEffect(() => {
    if (userLocation) {
      fetchListings();
    }
  }, [userLocation, fetchListings]);

  const handleCategorySelect = (categoryName) => {
    setSelectedCategory(categoryName);
    setSelectedSubcategory('');
  };

  const getCurrentCategory = () => {
    return categories.find(cat => cat.name === selectedCategory);
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

  const retryLocation = () => {
    setError(null);
    setLoading(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location retry successful:', position.coords.latitude, position.coords.longitude);
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setError(null);
          setLoading(false);
        },
        (error) => {
          console.error('Geolocation retry error:', error);
          let errorMessage = 'Location access is still required to browse rentals.';
          
          // eslint-disable-next-line default-case
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access was denied. Please enable location access in your browser settings and try again.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please check your internet connection.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }
          
          setError(errorMessage);
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000 // 1 minute for retry
        }
      );
    }
  };

  if (error) {
    return (
      <div className="rentals-page">
        <div className="rentals-container">
          <div className="rentals-header">
            <div className="header-left">
              <h1 className="rentals-title">Browse Rentals</h1>
            </div>
          </div>
          <div className="error">
            <h3>Location Required</h3>
            <p>{error}</p>
            <div style={{ marginTop: '20px' }}>
              <button 
                onClick={retryLocation}
                className="submit-btn"
                style={{ marginRight: '10px' }}
              >
                🔄 Try Again
              </button>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '15px' }}>
                <strong>How to enable location:</strong><br/>
                • Click the location icon in your browser's address bar<br/>
                • Select "Allow" for location access<br/>
                • Refresh the page if needed
              </p>
            </div>
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
            <h1 className="rentals-title">
              {selectedCategory ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Rentals` : 'Browse Rentals'}
            </h1>
          </div>
          <div className="location-status">
            <span className="location-icon">📍</span>
            <span>Showing rentals within 15km</span>
          </div>
        </div>

        {/* Filters */}
        {selectedCategory && (
          <div className="filters-section">
            <div className="filters-row">
              <div className="filter-group">
                <label className="filter-label">Category</label>
                <select 
                  className="filter-select"
                  value={selectedCategory}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.name} value={cat.name}>
                      {cat.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {getCurrentCategory()?.subcategories && (
                <div className="filter-group">
                  <label className="filter-label">Type</label>
                  <select 
                    className="filter-select"
                    value={selectedSubcategory}
                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                  >
                    <option value="">All Types</option>
                    {getCurrentCategory().subcategories.map(subcat => (
                      <option key={subcat.name} value={subcat.name}>
                        {subcat.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button 
                className="filter-select"
                onClick={() => {
                  setSelectedCategory('');
                  setSelectedSubcategory('');
                }}
                style={{ background: '#f8f9fa', cursor: 'pointer' }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {!selectedCategory ? (
          // Show categories
          <div className="categories-section">
            <h2 className="section-title">Choose a Category</h2>
            <CategoryGrid 
              categories={categories} 
              onCategorySelect={handleCategorySelect}
            />
          </div>
        ) : (
          // Show listings
          <div className="listings-section">
            <h2 className="section-title">
              Available Rentals
              {listings.length > 0 && (
                <span style={{ fontSize: '16px', fontWeight: 'normal', color: '#666', marginLeft: '10px' }}>
                  ({listings.length} found)
                </span>
              )}
            </h2>
            
            {loading ? (
              <div className="loading">
                <div className="loading-spinner"></div>
                <p>Loading rentals...</p>
              </div>
            ) : listings.length === 0 ? (
              <div className="no-listings">
                <h3>No rentals found</h3>
                <p>There are no available rentals in this category within 15km of your location.</p>
                <p>Try browsing other categories or check back later.</p>
              </div>
            ) : (
              <div className="listings-grid">
                {listings.map(listing => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RentalBrowse;