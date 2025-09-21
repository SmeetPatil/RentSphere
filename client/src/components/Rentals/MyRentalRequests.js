import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './MyRentalRequests.css';

const MyRentalRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchMyRequests();
    }, []);

    const fetchMyRequests = async () => {
        try {
            const response = await fetch('/api/my-rental-requests');
            const data = await response.json();

            if (data.success) {
                setRequests(data.requests);
            } else {
                setError(data.message || 'Failed to fetch rental requests');
            }
        } catch (error) {
            console.error('Error fetching rental requests:', error);
            setError('Failed to fetch rental requests');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { class: 'status-pending', text: 'Pending Review' },
            approved: { class: 'status-approved', text: 'Approved' },
            denied: { class: 'status-denied', text: 'Denied' }
        };

        const config = statusConfig[status] || { class: 'status-unknown', text: status };
        return <span className={`status-badge ${config.class}`}>{config.text}</span>;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getFirstImage = (images) => {
        if (!images || images.length === 0) return null;
        return images[0];
    };

    const getDefaultImage = (category) => {
        const defaults = {
            'electronics': 'https://img.icons8.com/?size=100&id=85103&format=png&color=000000',
            'vehicles': 'https://img.icons8.com/?size=100&id=13800&format=png&color=000000',
            'furniture': 'https://img.icons8.com/?size=100&id=26166&format=png&color=000000',
            'appliances': 'https://img.icons8.com/?size=100&id=24813&format=png&color=000000',
            'sports': 'https://img.icons8.com/?size=100&id=37654&format=png&color=000000',
            'tools': 'https://img.icons8.com/?size=100&id=87276&format=png&color=000000',
            'clothing': 'https://img.icons8.com/?size=100&id=25080&format=png&color=000000',
            'books': 'https://img.icons8.com/?size=100&id=19165&format=png&color=000000',
            'others': 'https://img.icons8.com/?size=100&id=87276&format=png&color=000000'
        };
        return defaults[category?.toLowerCase()] || defaults['others'];
    };

    if (loading) {
        return (
            <div className="rental-requests-page">
                <div className="requests-container">
                    <div className="loading">Loading your rental requests...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rental-requests-page">
                <div className="requests-container">
                    <div className="error-message">{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="rental-requests-page">
            <div className="requests-container">
                <div className="page-header">
                    <h1>My Rental Requests</h1>
                    <p>Track the status of your rental requests</p>
                </div>

                {requests.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <h3>No Rental Requests Yet</h3>
                        <p>You haven't made any rental requests yet. Browse items to get started!</p>
                        <Link to="/rentals" className="browse-btn">
                            Browse Rentals
                        </Link>
                    </div>
                ) : (
                    <div className="requests-grid">
                        {requests.map(request => (
                            <div key={request.id} className="request-card">
                                <div className="request-image">
                                    <img
                                        src={getFirstImage(request.listing_images) || getDefaultImage(request.listing_category)}
                                        alt={request.listing_title}
                                        onError={(e) => {
                                            e.target.src = getDefaultImage(request.listing_category);
                                        }}
                                    />
                                    {getStatusBadge(request.status)}
                                </div>

                                <div className="request-content">
                                    <h3 className="request-title">{request.listing_title}</h3>
                                    <p className="request-owner">Owner: {request.owner_name}</p>
                                    
                                    <div className="request-dates">
                                        <div className="date-range">
                                            <span className="date-label">Duration:</span>
                                            <span className="dates">
                                                {formatDate(request.start_date)} - {formatDate(request.end_date)}
                                            </span>
                                        </div>
                                        <div className="duration">
                                            <span className="days">{request.total_days} day{request.total_days !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>

                                    <div className="request-price">
                                        <span className="price-breakdown">
                                            ${request.listing_price_per_day}/day × {request.total_days} days
                                        </span>
                                        <span className="total-price">${request.total_price}</span>
                                    </div>

                                    {request.message && (
                                        <div className="request-message">
                                            <span className="message-label">Your message:</span>
                                            <p>"{request.message}"</p>
                                        </div>
                                    )}

                                    <div className="request-meta">
                                        <span className="request-date">
                                            Requested on {formatDate(request.created_at)}
                                        </span>
                                    </div>

                                    <div className="request-actions">
                                        <Link 
                                            to={`/rental/${request.listing_id}`}
                                            className="view-listing-btn"
                                        >
                                            View Listing
                                        </Link>
                                        {request.status === 'approved' && (
                                            <Link
                                                to={`/messages/new?user=${request.listing_id}&type=listing`}
                                                className="contact-owner-btn"
                                            >
                                                Contact Owner
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyRentalRequests;