import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RentalRequest.css';
import './DeliveryTracking.css';

const DeliveryTracking = ({ requestId, isReturn = false, onClose }) => {
    const [trackingData, setTrackingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTrackingData = async () => {
            try {
                const response = await axios.get(`/api/delivery-tracking/${requestId}`);
                setTrackingData(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching tracking data:', error);
                setError('Failed to load tracking information');
                setLoading(false);
            }
        };

        fetchTrackingData();
        
        // Refresh tracking data every 30 seconds
        const interval = setInterval(fetchTrackingData, 30000);
        
        return () => clearInterval(interval);
    }, [requestId]);

    const getStatusIcon = (status) => {
        switch(status) {
            case 'shipped': return '📦';
            case 'en_route': return '🚚';
            case 'delivered': return '✅';
            default: return '⏳';
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'shipped': return '#3498db';
            case 'en_route': return '#f39c12';
            case 'delivered': return '#27ae60';
            default: return '#95a5a6';
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Pending';
        const date = new Date(timestamp);
        return date.toLocaleString('en-IN', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const calculateEstimatedTime = (request) => {
        if (!request) return null;
        
        const status = isReturn ? request.return_delivery_status : request.delivery_status;
        
        if (status === 'delivered') return null;
        
        const shippedAt = isReturn ? request.return_shipped_at : request.delivery_shipped_at;
        if (!shippedAt) return null;
        
        const shippedTime = new Date(shippedAt);
        const now = new Date();
        const elapsed = (now - shippedTime) / (1000 * 60); // minutes
        
        // Calculate estimated total time based on distance (using cost as proxy)
        const deliveryCost = parseFloat(isReturn ? request.return_delivery_cost : request.delivery_cost) || 10;
        
        // Formula: 3 hours base + (cost/distance * 20 minutes)
        // Heavy items get 10-20% extra time
        let estimatedTotalMinutes = 180 + (deliveryCost * 20);
        
        // Check if heavy/sensitive item
        const category = request.category || '';
        const heavyItems = ['tv', 'drone', 'speaker', 'camera', 'laptop', 'gaming'];
        const isHeavy = heavyItems.some(item => category.toLowerCase().includes(item));
        
        if (isHeavy) {
            estimatedTotalMinutes *= 1.15; // 15% extra for heavy items
        }
        
        // Enforce 3-12 hour limits
        estimatedTotalMinutes = Math.max(180, Math.min(720, estimatedTotalMinutes));
        
        const remainingMinutes = Math.max(0, estimatedTotalMinutes - elapsed);
        
        if (remainingMinutes < 60) {
            return `Arriving soon (within ${Math.ceil(remainingMinutes)} minutes)`;
        } else {
            const hours = Math.floor(remainingMinutes / 60);
            const mins = Math.ceil(remainingMinutes % 60);
            if (mins === 0) {
                return `Estimated arrival in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
            }
            return `Estimated arrival in ${hours}h ${mins}m`;
        }
    };

    if (loading) {
        return (
            <div className="rental-request-overlay">
                <div className="rental-request-modal">
                    <div className="modal-header">
                        <h2>Loading...</h2>
                        <button className="close-button" onClick={onClose}>×</button>
                    </div>
                    <div className="loading-content">
                        <div className="loading-spinner"></div>
                        <p>Fetching tracking information...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rental-request-overlay">
                <div className="rental-request-modal">
                    <div className="modal-header">
                        <h2>Error</h2>
                        <button className="close-button" onClick={onClose}>×</button>
                    </div>
                    <div className="error-content">
                        <div className="error-icon">⚠️</div>
                        <p className="error-message">{error}</p>
                        <button className="btn-secondary" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        );
    }

    const { request, events } = trackingData;
    const currentStatus = isReturn ? request.return_delivery_status : request.delivery_status;
    const estimatedTime = calculateEstimatedTime(request);

    return (
        <div className="rental-request-overlay">
            <div className="rental-request-modal">
                {/* Header */}
                <div className="modal-header">
                    <h2>{isReturn ? '📤 Return Tracking' : '📦 Delivery Tracking'}</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                {/* Listing Summary */}
                <div className="listing-summary">
                    <h3>{request.title}</h3>
                    <p className="tracking-id">Request ID: #{request.id}</p>
                </div>

                {/* Current Status Section */}
                <div className="tracking-content">
                    <div className="current-status-section" style={{ 
                        borderLeft: `4px solid ${getStatusColor(currentStatus)}`
                    }}>
                        <div className="status-header">
                            <div className="status-icon-large" style={{ 
                                background: getStatusColor(currentStatus) 
                            }}>
                                {getStatusIcon(currentStatus)}
                            </div>
                            <div className="status-text">
                                <h3 className="status-title">
                                    {currentStatus ? currentStatus.replace('_', ' ').toUpperCase() : 'PENDING'}
                                </h3>
                                {estimatedTime && (
                                    <p className="estimated-time">⏱ {estimatedTime}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Delivery Address */}
                    {!isReturn && request.delivery_address && (
                        <div className="info-section">
                            <h4>📍 Delivery Address</h4>
                            <p>{request.delivery_address}</p>
                        </div>
                    )}

                    {/* Tracking Timeline */}
                    <div className="timeline-section">
                        <h4>Delivery Progress</h4>
                        <div className="tracking-timeline">
                            <div className={`timeline-step ${currentStatus === 'shipped' || currentStatus === 'en_route' || currentStatus === 'delivered' ? 'completed' : 'pending'}`}>
                                <div className="timeline-marker">
                                    <div className="timeline-dot"></div>
                                    <div className="timeline-line"></div>
                                </div>
                                <div className="timeline-details">
                                    <h5>📦 Shipped</h5>
                                    <p className="timeline-desc">Your order has been picked up and is being prepared</p>
                                    <span className="timeline-timestamp">
                                        {formatTimestamp(isReturn ? request.return_shipped_at : request.delivery_shipped_at)}
                                    </span>
                                </div>
                            </div>

                            <div className={`timeline-step ${currentStatus === 'en_route' || currentStatus === 'delivered' ? 'completed' : 'pending'}`}>
                                <div className="timeline-marker">
                                    <div className="timeline-dot"></div>
                                    <div className="timeline-line"></div>
                                </div>
                                <div className="timeline-details">
                                    <h5>🚚 En Route</h5>
                                    <p className="timeline-desc">Your order is out for delivery</p>
                                    <span className="timeline-timestamp">
                                        {formatTimestamp(isReturn ? request.return_en_route_at : request.delivery_en_route_at)}
                                    </span>
                                </div>
                            </div>

                            <div className={`timeline-step ${currentStatus === 'delivered' ? 'completed' : 'pending'}`}>
                                <div className="timeline-marker">
                                    <div className="timeline-dot"></div>
                                </div>
                                <div className="timeline-details">
                                    <h5>✅ Delivered</h5>
                                    <p className="timeline-desc">Your order has been successfully delivered</p>
                                    <span className="timeline-timestamp">
                                        {formatTimestamp(isReturn ? request.return_delivered_at : request.delivery_delivered_at)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Events */}
                    {events && events.length > 0 && (
                        <div className="events-section">
                            <h4>📋 Detailed Updates</h4>
                            <div className="events-list">
                                {events.map((event, index) => (
                                    <div key={index} className="event-item">
                                        <span className="event-time">{formatTimestamp(event.event_time)}</span>
                                        <span className="event-desc">{event.description}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Help Note */}
                    <div className="info-note">
                        <p>
                            <strong>💡 Note:</strong> Delivery times may vary based on distance and item type. 
                            Heavy items like TVs and drones may take longer.
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="modal-footer">
                    <button className="btn-primary full-width" onClick={onClose}>
                        Close Tracking
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeliveryTracking;
