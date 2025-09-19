import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Rentals.css';

const MyListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/my-listings');
      
      if (response.data.success) {
        setListings(response.data.listings);
      } else {
        setError('Failed to load your listings');
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (listingId, currentStatus) => {
    try {
      const response = await axios.patch(`/api/listings/${listingId}/availability`, {
        isAvailable: !currentStatus
      });

      if (response.data.success) {
        // Update the listing in state
        setListings(prev => prev.map(listing => 
          listing.id === listingId 
            ? { ...listing, is_available: !currentStatus }
            : listing
        ));
      }
    } catch (err) {
      console.error('Error updating availability:', err);
      alert('Failed to update listing availability');
    }
  };

  const deleteListing = async (listingId, listingTitle) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${listingTitle}"?\n\nThis will permanently delete the listing and all its images from Google Drive. This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      setLoading(true);
      const response = await axios.delete(`/api/listings/${listingId}`);

      if (response.data.success) {
        // Remove the listing from state
        setListings(prev => prev.filter(listing => listing.id !== listingId));
        alert('Listing and images deleted successfully!');
      }
    } catch (err) {
      console.error('Error deleting listing:', err);
      alert('Failed to delete listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return `₹${parseFloat(price).toFixed(0)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  if (loading) {
    return (
      <div className="rentals-page">
        <div className="rentals-container">
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading your listings...</p>
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
            <Link to="/dashboard" className="back-to-dashboard-btn">
              ← Dashboard
            </Link>
            <h1 className="rentals-title">My Listings</h1>
          </div>
          <Link to="/create-listing" className="new-message-btn">
            + New Listing
          </Link>
        </div>

        {/* Content */}
        <div className="listings-section">
          {error && (
            <div className="error">
              {error}
            </div>
          )}

          {listings.length === 0 ? (
            <div className="no-listings">
              <h3>No listings yet</h3>
              <p>You haven't created any rental listings yet.</p>
              <Link to="/create-listing" className="start-conversation-btn">
                Create Your First Listing
              </Link>
            </div>
          ) : (
            <>
              <div className="listings-stats">
                <div className="stat-card">
                  <div className="stat-number">{listings.length}</div>
                  <div className="stat-label">Total Listings</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {listings.filter(l => l.is_available).length}
                  </div>
                  <div className="stat-label">Active</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {listings.filter(l => !l.is_available).length}
                  </div>
                  <div className="stat-label">Inactive</div>
                </div>
              </div>

              <div className="my-listings-grid">
                {listings.map(listing => (
                  <div key={listing.id} className="my-listing-card">
                    <div className="listing-image-container">
                      <img 
                        src={listing.images && listing.images.length > 0 
                          ? listing.images[0] 
                          : getDefaultImage(listing.category)
                        }
                        alt={listing.title}
                        className="listing-image"
                        onError={(e) => {
                          e.target.src = getDefaultImage(listing.category);
                        }}
                      />
                      <div className={`availability-badge ${listing.is_available ? 'active' : 'inactive'}`}>
                        {listing.is_available ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    
                    <div className="listing-content">
                      <h3 className="listing-title">{listing.title}</h3>
                      
                      <div className="listing-meta">
                        <div className="listing-price">
                          {formatPrice(listing.price_per_day)}/day
                        </div>
                        <div className="listing-category">
                          {listing.category.charAt(0).toUpperCase() + listing.category.slice(1)}
                        </div>
                      </div>
                      
                      <div className="listing-stats">
                        <div className="stat">
                          <span className="stat-label">Rating:</span>
                          <span className="stat-value">
                            {parseFloat(listing.average_rating) > 0 
                              ? `⭐ ${parseFloat(listing.average_rating).toFixed(1)} (${listing.rating_count})`
                              : 'No ratings yet'
                            }
                          </span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Created:</span>
                          <span className="stat-value">{formatDate(listing.created_at)}</span>
                        </div>
                      </div>
                      
                      <div className="listing-description">
                        {listing.description.length > 100 
                          ? `${listing.description.substring(0, 100)}...`
                          : listing.description
                        }
                      </div>
                      
                      <div className="listing-actions">
                        <button
                          onClick={() => toggleAvailability(listing.id, listing.is_available)}
                          className={`availability-btn ${listing.is_available ? 'deactivate' : 'activate'}`}
                        >
                          {listing.is_available ? 'Deactivate' : 'Activate'}
                        </button>
                        <Link 
                          to={`/rental/${listing.id}`}
                          className="view-btn"
                        >
                          View
                        </Link>
                        <Link 
                          to={`/edit-listing/${listing.id}`}
                          className="view-btn"
                          style={{ background: '#ea580c' }}
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => deleteListing(listing.id, listing.title)}
                          className="availability-btn deactivate"
                          style={{ background: '#dc2626' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyListings;