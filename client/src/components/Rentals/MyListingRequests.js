import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Rentals.css';
import './MyListingRequests.css';

const MyListingRequests = () => {
    const [listingRequests, setListingRequests] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionMessage, setActionMessage] = useState({ type: '', message: '', visible: false });
    const [denialModal, setDenialModal] = useState({ visible: false, requestId: null, denialReason: '' });
    const [activeTab, setActiveTab] = useState('pending');

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
                        Total: ${request.total_price}
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
        </div>
    );
};

export default MyListingRequests;