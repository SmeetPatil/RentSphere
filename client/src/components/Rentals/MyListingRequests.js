import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Rentals.css';
import './MyListingRequests.css';
import DeliveryTracking from './DeliveryTracking';

const MyListingRequests = () => {
    const [listingRequests, setListingRequests] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionMessage, setActionMessage] = useState({ type: '', message: '', visible: false });
    const [denialModal, setDenialModal] = useState({ visible: false, requestId: null, denialReason: '' });
    const [trackingModal, setTrackingModal] = useState({ visible: false, requestId: null, isReturn: false });
    const [ratingModal, setRatingModal] = useState({ visible: false, requestId: null, renterName: '', listingTitle: '' });
    const [ownerRatingModal, setOwnerRatingModal] = useState({ visible: false, requestId: null, ownerName: '', listingTitle: '' });
    const [rating, setRating] = useState({ delivery: 0, item_condition: 0, communication: 0, comment: '' });
    const [ownerRating, setOwnerRating] = useState({ rating: 0, review: '' });
    const [activeTab, setActiveTab] = useState('pending');

    useEffect(() => {
        fetchMyListings();
        
        // Start automatic delivery simulation polling
        const deliverySimulationInterval = setInterval(async () => {
            try {
                console.log('🔄 Running automatic delivery simulation...');
                const response = await fetch('/api/delivery/simulate-delivery-progress');
                const data = await response.json();
                
                if (data.updatesProcessed > 0) {
                    console.log(`📦 ${data.updatesProcessed} deliveries updated:`, data.updates);
                    await fetchMyListings();
                    
                    data.updates.forEach(update => {
                        showActionMessage('success', update.message);
                    });
                }
            } catch (error) {
                console.error('Delivery simulation error:', error);
            }
        }, 30000);
        
        // Start automatic return delivery simulation polling
        const returnSimulationInterval = setInterval(async () => {
            try {
                console.log('🔄 Running automatic return delivery simulation...');
                const response = await fetch('/api/delivery/simulate-return-delivery-progress');
                const data = await response.json();
                
                if (data.updatesProcessed > 0) {
                    console.log(`📦 ${data.updatesProcessed} return deliveries updated:`, data.updates);
                    await fetchMyListings();
                    
                    data.updates.forEach(update => {
                        showActionMessage('success', update.message);
                    });
                }
            } catch (error) {
                console.error('Return delivery simulation error:', error);
            }
        }, 30000);
        
        return () => {
            clearInterval(deliverySimulationInterval);
            clearInterval(returnSimulationInterval);
        };
    }, []);

    const showActionMessage = (type, message) => {
        setActionMessage({ type, message, visible: true });
        setTimeout(() => {
            setActionMessage({ type: '', message: '', visible: false });
        }, 5000);
    };

    const fetchMyListings = async () => {
        try {
            // First get all user's listings
            const listingsResponse = await fetch('/api/my-listings');
            const listingsData = await listingsResponse.json();

            if (listingsData.success) {
                const requestsData = {};
                
                // For each listing, fetch its rental requests
                for (const listing of listingsData.listings) {
                    try {
                        const requestsResponse = await fetch(`/api/rental-requests/listing/${listing.id}`);
                        const requestsResult = await requestsResponse.json();
                        
                        if (requestsResult.success) {
                            requestsData[listing.id] = {
                                listing: listing,
                                requests: requestsResult.requests
                            };
                        }
                    } catch (error) {
                        console.error(`Error fetching requests for listing ${listing.id}:`, error);
                        requestsData[listing.id] = {
                            listing: listing,
                            requests: []
                        };
                    }
                }
                
                setListingRequests(requestsData);
            } else {
                setError('Failed to fetch your listings');
            }
        } catch (error) {
            console.error('Error fetching listings:', error);
            setError('Failed to load listing requests');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestAction = async (requestId, action, denialReason = null) => {
        try {
            const requestBody = { status: action };
            if (action === 'denied' && denialReason) {
                requestBody.denial_reason = denialReason;
            }

            const response = await fetch(`/api/rental-requests/${requestId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (data.success) {
                // Refresh the data to show updated status
                await fetchMyListings();
                showActionMessage('success', `Rental request ${action} successfully!`);
                
                // Close denial modal if it was open
                if (denialModal.visible) {
                    setDenialModal({ visible: false, requestId: null, denialReason: '' });
                }
            } else {
                showActionMessage('error', data.message || `Failed to ${action} request`);
            }
        } catch (error) {
            console.error(`Error ${action}ing request:`, error);
            showActionMessage('error', `Failed to ${action} request`);
        }
    };

    const handleConfirmPickup = async (requestId) => {
        try {
            await fetch('/api/confirm-pickup-lister', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId })
            });
            
            showActionMessage('success', 'Pickup confirmed successfully!');
            await fetchMyListings();
        } catch (error) {
            console.error('Error confirming pickup:', error);
            showActionMessage('error', 'Failed to confirm pickup');
        }
    };

    const handleConfirmReturn = async (requestId) => {
        try {
            await fetch('/api/confirm-return-lister', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId })
            });
            
            showActionMessage('success', 'Return confirmed and rental reactivated!');
            await fetchMyListings();
        } catch (error) {
            console.error('Error confirming return:', error);
            showActionMessage('error', 'Failed to confirm return');
        }
    };

    const handleDenyRequest = (requestId) => {
        setDenialModal({ visible: true, requestId, denialReason: '' });
    };

    const handleDenialSubmit = () => {
        if (!denialModal.denialReason.trim()) {
            showActionMessage('error', 'Please provide a reason for denial');
            return;
        }
        handleRequestAction(denialModal.requestId, 'denied', denialModal.denialReason);
    };

    const handleRatingSubmit = async () => {
        if (rating.delivery === 0 || rating.item_condition === 0 || rating.communication === 0) {
            showActionMessage('error', 'Please provide all ratings');
            return;
        }

        try {
            const response = await fetch(`/api/rental-requests/${ratingModal.requestId}/rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    delivery_rating: rating.delivery,
                    item_condition_rating: rating.item_condition,
                    communication_rating: rating.communication,
                    comment: rating.comment,
                    rater_type: 'lister'
                })
            });

            const data = await response.json();
            if (data.success) {
                showActionMessage('success', 'Rating submitted successfully');
                setRatingModal({ visible: false, requestId: null, renterName: '', listingTitle: '' });
                setRating({ delivery: 0, item_condition: 0, communication: 0, comment: '' });
                fetchMyListings();
            } else {
                showActionMessage('error', data.message || 'Failed to submit rating');
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
            showActionMessage('error', 'Failed to submit rating');
        }
    };

    const handleOwnerRatingSubmit = async () => {
        if (ownerRating.rating === 0) {
            showActionMessage('error', 'Please provide a rating');
            return;
        }

        try {
            const response = await fetch(`/api/rental-requests/${ownerRatingModal.requestId}/rate-owner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    rating: ownerRating.rating,
                    review: ownerRating.review
                })
            });

            const data = await response.json();
            if (data.success) {
                showActionMessage('success', 'Owner rating submitted successfully! ⭐');
                setOwnerRatingModal({ visible: false, requestId: null, ownerName: '', listingTitle: '' });
                setOwnerRating({ rating: 0, review: '' });
                fetchMyListings();
            } else {
                showActionMessage('error', data.error || 'Failed to submit owner rating');
            }
        } catch (error) {
            console.error('Error submitting owner rating:', error);
            showActionMessage('error', 'Failed to submit owner rating');
        }
    };

    // Get all requests across all listings
    const getAllRequests = () => {
        const allRequests = [];
        Object.values(listingRequests).forEach(({ listing, requests }) => {
            requests.forEach(request => {
                allRequests.push({
                    ...request,
                    listing_title: listing.title,
                    listing_price: listing.price_per_day,
                    listing_id: listing.id,
                    listing_images: listing.images || []
                });
            });
        });
        return allRequests;
    };

    const filterRequestsByStatus = (status) => {
        return getAllRequests().filter(request => request.status === status);
    };

    const getTabCounts = () => {
        const allRequests = getAllRequests();
        return {
            pending: allRequests.filter(r => r.status === 'pending').length,
            approved: allRequests.filter(r => r.status === 'approved').length,
            paid: allRequests.filter(r => r.status === 'paid').length,
            denied: allRequests.filter(r => r.status === 'denied').length
        };
    };

    const getStatusBadge = (status) => {
        const statusClasses = {
            pending: 'status-pending',
            approved: 'status-approved',
            paid: 'status-paid',
            denied: 'status-denied'
        };

        return (
            <span className={`status-badge ${statusClasses[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const calculateDays = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    };

    if (loading) {
        return <div className="loading">Loading your listing requests...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    // Helper function to render individual request cards
    const renderRequestCard = (request, listing) => {
        return (
            <div key={request.id} className="request-card">
                <div className="request-header">
                    <div className="listing-info">
                        <h4 className="listing-title">{listing.title}</h4>
                        <p className="listing-price">₹{listing.price_per_day}/day</p>
                    </div>
                    <div className="renter-info">
                        {request.renter_profile_picture && (
                            <img 
                                src={request.renter_profile_picture} 
                                alt={request.renter_name}
                                className="renter-avatar"
                            />
                        )}
                        <div>
                            <h5>{request.renter_name}</h5>
                            <p className="renter-contact">{request.renter_contact}</p>
                        </div>
                    </div>
                    {getStatusBadge(request.status)}
                </div>

                <div className="request-details">
                    <div className="rental-dates">
                        <span className="date-range">
                            {formatDate(request.start_date)} - {formatDate(request.end_date)}
                        </span>
                        <span className="duration">
                            ({calculateDays(request.start_date, request.end_date)} days)
                        </span>
                    </div>
                    
                    <div className="total-price">
                        Total: ₹{request.total_price}
                    </div>
                </div>

                {request.message && (
                    <div className="request-message">
                        <strong>Message:</strong>
                        <p>{request.message}</p>
                    </div>
                )}

                {request.status === 'denied' && request.denial_reason && (
                    <div className="denial-reason">
                        <strong>Denial Reason:</strong>
                        <p>{request.denial_reason}</p>
                    </div>
                )}

                <div className="request-date">
                    Requested on {formatDate(request.created_at)}
                </div>

                {request.status === 'pending' && (
                    <div className="request-actions">
                        <button
                            onClick={() => handleRequestAction(request.id, 'approved')}
                            className="btn btn-approve"
                        >
                            Approve
                        </button>
                        <button
                            onClick={() => handleDenyRequest(request.id)}
                            className="btn btn-deny"
                        >
                            Deny
                        </button>
                        <Link 
                            to={`/messages/new?user=${request.renter_user_id}&type=${request.renter_user_type}&subject=Re: Rental Request for ${listing.title}`}
                            className="btn btn-message"
                        >
                            Message Renter
                        </Link>
                    </div>
                )}

                {/* Pickup confirmation for lister */}
                {request.status === 'paid' && request.delivery_option === 'pickup' && !request.pickup_confirmed_by_lister && (
                    <div className="request-actions">
                        <button
                            onClick={() => handleConfirmPickup(request.id)}
                            className="btn btn-approve"
                        >
                            ✅ Confirm Pickup
                        </button>
                    </div>
                )}

                {/* Smart delivery status buttons */}
                {request.status === 'paid' && request.delivery_option === 'delivery' && request.delivery_paid && (
                    <div className="request-actions">
                        {/* Show Track Delivery until renter confirms receipt */}
                        {!request.delivery_confirmed && (
                            <button
                                onClick={() => setTrackingModal({ visible: true, requestId: request.id, isReturn: false })}
                                className="btn btn-message"
                            >
                                📦 Track Delivery
                            </button>
                        )}
                        
                        {/* Show Rate Delivery when renter confirms delivery */}
                        {request.delivery_confirmed && !request.delivery_rated && (
                            <button
                                onClick={() => setRatingModal({ 
                                    visible: true, 
                                    requestId: request.id, 
                                    renterName: request.renter_name,
                                    listingTitle: listing.title
                                })}
                                className="btn btn-approve"
                            >
                                ⭐ Rate Delivery
                            </button>
                        )}
                        
                        {/* Show Rate Owner button when renter confirms delivery */}
                        {request.delivery_confirmed && !request.owner_rated && (
                            <button
                                onClick={() => setOwnerRatingModal({ 
                                    visible: true, 
                                    requestId: request.id, 
                                    ownerName: listing.owner_name || 'Owner',
                                    listingTitle: listing.title
                                })}
                                className="btn btn-message"
                                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                            >
                                👤 Rate Owner
                            </button>
                        )}
                        
                        {/* Show completed status when both are rated */}
                        {request.delivery_confirmed && request.delivery_rated && request.owner_rated && (
                            <div className="delivery-completed">
                                <span className="status-badge delivered">✅ Delivery Completed & Rated</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Confirm return received */}
                {request.return_initiated && !request.return_confirmed_by_lister && (
                    <div className="request-actions">
                        <button
                            onClick={() => handleConfirmReturn(request.id)}
                            className="btn btn-approve"
                        >
                            ✅ Confirm Return Received
                        </button>
                    </div>
                )}

                {/* View return tracking */}
                {request.return_initiated && request.return_option === 'delivery' && request.return_delivery_status !== 'delivered' && (
                    <div className="request-actions">
                        <button
                            onClick={() => setTrackingModal({ visible: true, requestId: request.id, isReturn: true })}
                            className="btn btn-message"
                        >
                            📦 Track Return Delivery
                        </button>
                    </div>
                )}

                <div className="card-actions">
                    <Link to={`/rental/${listing.id}`} className="view-listing-link">
                        View Listing
                    </Link>
                </div>
            </div>
        );
    };

    // Helper function to render tab content
    const renderTabContent = () => {
        const filteredRequests = filterRequestsByStatus(activeTab);

        if (filteredRequests.length === 0) {
            const emptyMessages = {
                pending: "No pending requests at the moment.",
                approved: "No approved requests yet.",
                paid: "No paid requests to display.",
                denied: "No denied requests to display."
            };

            return (
                <div className="empty-state">
                    <h3>{emptyMessages[activeTab]}</h3>
                    <p>
                        {activeTab === 'pending' 
                            ? "When users request to rent your items, they'll appear here."
                            : activeTab === 'paid'
                            ? "Requests with completed payments will be shown here."
                            : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} requests will be shown here.`
                        }
                    </p>
                </div>
            );
        }

        return (
            <div className="requests-grid">
                {filteredRequests.map((request) => {
                    // Find the corresponding listing
                    const listing = Object.values(listingRequests).find(
                        ({ listing }) => listing.id === request.listing_id
                    )?.listing;
                    
                    return renderRequestCard(request, listing);
                })}
            </div>
        );
    };

    return (
        <>
        <div className="rentals-page">
            <div className="rentals-container">
                {actionMessage.visible && (
                    <div className={`action-message ${actionMessage.type === 'success' ? 'success' : 'error'}`}>
                        <div className="message-content">
                            <span className="message-icon">
                                {actionMessage.type === 'success' ? '✅' : '❌'}
                            </span>
                            <span className="message-text">{actionMessage.message}</span>
                            <button 
                                className="close-message"
                                onClick={() => setActionMessage({ type: '', message: '', visible: false })}
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Header */}
                <div className="rentals-header">
                    <div className="header-left">
                        <h1 className="rentals-title">Incoming Requests</h1>
                    </div>
                </div>

                {getAllRequests().length === 0 ? (
                    <div className="form-section">
                        <div className="no-listings">
                            <h3>No rental requests yet</h3>
                            <p>When someone requests to rent your items, they'll appear here.</p>
                            <Link to="/my-listings" className="submit-btn">
                                View My Listings
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Filters/Tabs Section */}
                        <div className="form-section">
                            <div className="tabs-container">
                        <div className="tabs">
                            {['pending', 'approved', 'paid', 'denied'].map(tab => {
                                const count = getTabCounts()[tab];
                                return (
                                    <button
                                        key={tab}
                                        className={`tab ${activeTab === tab ? 'active' : ''}`}
                                        onClick={() => setActiveTab(tab)}
                                    >
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                        {count > 0 && <span className="tab-count">{count}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                        {/* Tab Content */}
                        <div className="tab-content">
                            {renderTabContent()}
                        </div>
                    </div>
                </>
                )}
            </div>
        </div>

            {/* Denial Reason Modal */}
            {denialModal.visible && (
                <div className="modal-overlay">
                    <div className="denial-modal">
                        <div className="modal-header">
                            <h3>Deny Rental Request</h3>
                            <button 
                                className="modal-close"
                                onClick={() => setDenialModal({ visible: false, requestId: null, denialReason: '' })}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-content">
                            <p>Please provide a reason for denying this rental request:</p>
                            <textarea
                                value={denialModal.denialReason}
                                onChange={(e) => setDenialModal({...denialModal, denialReason: e.target.value})}
                                placeholder="Enter reason for denial..."
                                rows={4}
                                className="denial-textarea"
                            />
                        </div>
                        <div className="modal-actions">
                            <button 
                                className="btn btn-cancel"
                                onClick={() => setDenialModal({ visible: false, requestId: null, denialReason: '' })}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-deny"
                                onClick={handleDenialSubmit}
                                disabled={!denialModal.denialReason.trim()}
                            >
                                Deny Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delivery Tracking Modal */}
            {trackingModal.visible && (
                <DeliveryTracking
                    requestId={trackingModal.requestId}
                    isReturn={trackingModal.isReturn}
                    onClose={() => setTrackingModal({ visible: false, requestId: null, isReturn: false })}
                />
            )}

            {/* Rating Modal */}
            {ratingModal.visible && (
                <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setRatingModal({ visible: false, requestId: null, renterName: '', listingTitle: '' })}>
                    <div className="rating-modal modal-content">
                        <div className="modal-header">
                            <h2>⭐ Rate Renter: {ratingModal.renterName}</h2>
                            <button 
                                className="modal-close"
                                onClick={() => setRatingModal({ visible: false, requestId: null, renterName: '', listingTitle: '' })}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="rating-content">
                            <h3>📦 {ratingModal.listingTitle}</h3>
                            
                            <div className="rating-sections">
                                <div className="rating-section">
                                    <div className="rating-header">
                                        <h4>🚚 Delivery Experience</h4>
                                        <div className="rating-stars">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <span 
                                                    key={star}
                                                    className={`star ${rating.delivery >= star ? 'active' : ''}`}
                                                    onClick={() => setRating(prev => ({ ...prev, delivery: star }))}
                                                >
                                                    ⭐
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="rating-section">
                                    <div className="rating-header">
                                        <h4>📦 Item Condition</h4>
                                        <div className="rating-stars">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <span 
                                                    key={star}
                                                    className={`star ${rating.item_condition >= star ? 'active' : ''}`}
                                                    onClick={() => setRating(prev => ({ ...prev, item_condition: star }))}
                                                >
                                                    ⭐
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="rating-section">
                                    <div className="rating-header">
                                        <h4>💬 Communication</h4>
                                        <div className="rating-stars">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <span 
                                                    key={star}
                                                    className={`star ${rating.communication >= star ? 'active' : ''}`}
                                                    onClick={() => setRating(prev => ({ ...prev, communication: star }))}
                                                >
                                                    ⭐
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="rating-section">
                                    <h4>💭 Additional Comments</h4>
                                    <textarea
                                        value={rating.comment}
                                        onChange={(e) => setRating(prev => ({ ...prev, comment: e.target.value }))}
                                        placeholder="Share your experience with this renter..."
                                        className="rating-comment"
                                        rows="4"
                                    />
                                </div>
                            </div>
                            
                            <div className="modal-actions">
                                <button 
                                    onClick={() => setRatingModal({ visible: false, requestId: null, renterName: '', listingTitle: '' })}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleRatingSubmit}
                                    className="btn btn-primary"
                                >
                                    Submit Rating
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Owner Rating Modal */}
            {ownerRatingModal.visible && (
                <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setOwnerRatingModal({ visible: false, requestId: null, ownerName: '', listingTitle: '' })}>
                    <div className="rating-modal modal-content">
                        <div className="modal-header">
                            <h2>👤 Rate Owner: {ownerRatingModal.ownerName}</h2>
                            <button 
                                className="modal-close"
                                onClick={() => setOwnerRatingModal({ visible: false, requestId: null, ownerName: '', listingTitle: '' })}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="rating-content">
                            <h3>📦 {ownerRatingModal.listingTitle}</h3>
                            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '20px' }}>
                                Rate your experience with this owner/lister
                            </p>
                            
                            <div className="rating-sections">
                                <div className="rating-section">
                                    <div className="rating-header">
                                        <h4>⭐ Overall Rating</h4>
                                        <div className="rating-stars">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <span 
                                                    key={star}
                                                    className={`star ${ownerRating.rating >= star ? 'active' : ''}`}
                                                    onClick={() => setOwnerRating(prev => ({ ...prev, rating: star }))}
                                                >
                                                    ⭐
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', marginTop: '8px' }}>
                                        Consider: Communication, item accuracy, professionalism, overall experience
                                    </p>
                                </div>
                                
                                <div className="rating-section">
                                    <h4>💭 Review (Optional)</h4>
                                    <textarea
                                        value={ownerRating.review}
                                        onChange={(e) => setOwnerRating(prev => ({ ...prev, review: e.target.value }))}
                                        placeholder="Share your experience with this owner... Was the item as described? Was communication good?"
                                        className="rating-comment"
                                        rows="4"
                                    />
                                </div>
                            </div>
                            
                            <div className="modal-actions">
                                <button 
                                    onClick={() => setOwnerRatingModal({ visible: false, requestId: null, ownerName: '', listingTitle: '' })}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleOwnerRatingSubmit}
                                    className="btn btn-primary"
                                    disabled={ownerRating.rating === 0}
                                >
                                    Submit Rating
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MyListingRequests;