import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './MyListingRequests.css';

const MyListingRequests = () => {
    const [listingRequests, setListingRequests] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionMessage, setActionMessage] = useState({ type: '', message: '', visible: false });
    const [denialModal, setDenialModal] = useState({ visible: false, requestId: null, denialReason: '' });

    useEffect(() => {
        fetchMyListings();
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

    const getStatusBadge = (status) => {
        const statusClasses = {
            pending: 'status-pending',
            approved: 'status-approved',
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

    const listingsWithRequests = Object.values(listingRequests).filter(
        item => item.requests.length > 0
    );

    const totalPendingRequests = Object.values(listingRequests).reduce(
        (total, item) => total + item.requests.filter(req => req.status === 'pending').length, 0
    );

    return (
        <div className="my-listing-requests">
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
            
            <div className="page-header">
                <h1>Rental Requests on My Listings</h1>
                <p>Manage requests from other users who want to rent your items</p>
                {totalPendingRequests > 0 && (
                    <div className="pending-badge">
                        {totalPendingRequests} pending request{totalPendingRequests !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            {listingsWithRequests.length === 0 ? (
                <div className="no-requests">
                    <h3>No rental requests yet</h3>
                    <p>When someone requests to rent your items, they'll appear here.</p>
                    <Link to="/my-listings" className="btn btn-primary">
                        View My Listings
                    </Link>
                </div>
            ) : (
                <div className="listings-with-requests">
                    {listingsWithRequests.map(({ listing, requests }) => (
                        <div key={listing.id} className="listing-requests-card">
                            <div className="listing-header">
                                <div className="listing-info">
                                    <h3>{listing.title}</h3>
                                    <p className="listing-price">${listing.price_per_day}/day</p>
                                    <span className="request-count">
                                        {requests.length} request{requests.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <Link to={`/rental/${listing.id}`} className="view-listing-btn">
                                    View Listing
                                </Link>
                            </div>

                            <div className="requests-list">
                                {requests.map((request) => (
                                    <div key={request.id} className="request-item">
                                        <div className="request-header">
                                            <div className="renter-info">
                                                {request.renter_profile_picture && (
                                                    <img 
                                                        src={request.renter_profile_picture} 
                                                        alt={request.renter_name}
                                                        className="renter-avatar"
                                                    />
                                                )}
                                                <div>
                                                    <h4>{request.renter_name}</h4>
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
                                                Total: ${request.total_price}
                                            </div>
                                        </div>

                                        {request.message && (
                                            <div className="request-message">
                                                <strong>Message:</strong>
                                                <p>{request.message}</p>
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
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
        </div>
    );
};

export default MyListingRequests;