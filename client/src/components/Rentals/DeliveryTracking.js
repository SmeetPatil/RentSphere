import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RentalRequest.css';
import './DeliveryTracking.css';

const DeliveryTracking = ({ requestId, isReturn = false, onClose }) => {
    const [trackingData, setTrackingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirming, setConfirming] = useState(false);

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

    const handleConfirmDelivery = async () => {
        try {
            setConfirming(true);
            await axios.post(`/api/confirm-delivery/${requestId}`);
            
            // Update local state to reflect confirmation
            setTrackingData(prev => ({
                ...prev,
                request: {
                    ...prev.request,
                    delivery_confirmed: true
                }
            }));
            
            // Close the modal and trigger parent refresh
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (error) {
            console.error('Error confirming delivery:', error);
            alert('Failed to confirm delivery. Please try again.');
        } finally {
            setConfirming(false);
        }
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'shipped': return '📦';
            case 'en_route':
            case 'in_transit': return '🚚';
            case 'delivered': return '✅';
            default: return '⏳';
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'shipped': return '#3498db';
            case 'en_route':
            case 'in_transit': return '#f39c12';
            case 'delivered': return '#27ae60';
            default: return '#95a5a6';
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Pending';
        
        // Convert UTC to IST (UTC+5:30)
        const date = new Date(timestamp);
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const istDate = new Date(date.getTime() + istOffset);
        
        return istDate.toLocaleString('en-IN', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true,
            timeZone: 'UTC' // Display the adjusted time as-is
        });
    };

    const calculateEstimatedTime = (request) => {
        if (!request) return null;
        
        const status = isReturn ? request.return_delivery_status : request.delivery_status;
        
        if (status === 'delivered') return null;
        
        // Use expected delivery time from database
        const expectedDeliveredAt = isReturn ? request.expected_return_delivered_at : request.expected_delivered_at;
        if (!expectedDeliveredAt) return null;
        
        const expectedTime = new Date(expectedDeliveredAt);
        const now = new Date();
        const remainingMinutes = Math.max(0, (expectedTime - now) / (1000 * 60));
        
        if (remainingMinutes < 1) {
            return 'Arriving any moment now';
        } else if (remainingMinutes < 60) {
            return `Arriving soon (within ${Math.ceil(remainingMinutes)} minutes)`;
        } else {
            const hours = Math.floor(remainingMinutes / 60);
            const mins = Math.round(remainingMinutes % 60);
            if (mins === 0 || mins === 60) {
                const totalHours = mins === 60 ? hours + 1 : hours;
                return `Estimated arrival in ${totalHours} ${totalHours === 1 ? 'hour' : 'hours'}`;
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

    const { request } = trackingData;
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
                                    {currentStatus === 'in_transit' ? 'IN TRANSIT' : (currentStatus ? currentStatus.replace('_', ' ').toUpperCase() : 'PENDING')}
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
                            <div className={`timeline-step ${currentStatus === 'shipped' || currentStatus === 'en_route' || currentStatus === 'in_transit' || currentStatus === 'delivered' ? 'completed' : 'pending'}`}>
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

                            <div className={`timeline-step ${currentStatus === 'en_route' || currentStatus === 'in_transit' || currentStatus === 'delivered' ? 'completed' : 'pending'}`}>
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

                    {/* Expected Delivery Time */}
                    {currentStatus !== 'delivered' && (
                        <div className="expected-delivery-section">
                            <h4>� Expected Delivery</h4>
                            <div className="expected-delivery-info">
                                <div className="expected-time-large">
                                    {isReturn ? (
                                        request.expected_return_delivered_at ? 
                                            formatTimestamp(request.expected_return_delivered_at) :
                                            'Pending'
                                    ) : (
                                        formatTimestamp(request.expected_delivered_at)
                                    )}
                                </div>
                                <p className="expected-note">
                                    Estimated delivery time based on distance and item type
                                </p>
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
                    {currentStatus === 'delivered' && !request.delivery_confirmed ? (
                        <div className="delivery-confirmation">
                            <div className="confirmation-message">
                                <p className="confirmation-text">
                                    <strong>📦 Delivery Completed!</strong><br/>
                                    Please confirm that you have received the item to proceed with rating.
                                </p>
                            </div>
                            <button 
                                className="btn-success full-width" 
                                onClick={handleConfirmDelivery}
                                disabled={confirming}
                            >
                                {confirming ? 'Confirming...' : '✅ Confirm Delivery Received'}
                            </button>
                            <button className="btn-secondary full-width" onClick={onClose} style={{ marginTop: '10px' }}>
                                Close Tracking
                            </button>
                        </div>
                    ) : (
                        <button className="btn-primary full-width" onClick={onClose}>
                            Close Tracking
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeliveryTracking;
