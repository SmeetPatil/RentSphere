import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Rentals.css';
import './MyRentalRequests.css';
import DeliveryOption from './DeliveryOption';
import DeliveryTracking from './DeliveryTracking';
import Rating from './Rating';

// Helper functions for calculations
const calculatePlatformFee = (totalPrice) => {
    return (totalPrice * 0.10).toFixed(2);
};

const calculateTotalWithFee = (totalPrice) => {
    return (parseFloat(totalPrice) + parseFloat(calculatePlatformFee(totalPrice))).toFixed(2);
};

const MyRentalRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('pending');
    const [paymentModal, setPaymentModal] = useState({ visible: false, request: null });
    const [receiptModal, setReceiptModal] = useState({ visible: false, request: null });
    const [deliveryOptionModal, setDeliveryOptionModal] = useState({ visible: false, request: null });
    const [deliveryPaymentModal, setDeliveryPaymentModal] = useState({ visible: false, request: null, cost: 0 });
    const [trackingModal, setTrackingModal] = useState({ visible: false, requestId: null });
    const [ratingModal, setRatingModal] = useState({ visible: false, request: null });
    const [returnModal, setReturnModal] = useState({ visible: false, request: null });
    const [returnPaymentModal, setReturnPaymentModal] = useState({ visible: false, request: null, cost: 0, lateFeeInfo: null });
    const [actionMessage, setActionMessage] = useState({ type: '', message: '', visible: false });

    useEffect(() => {
        fetchMyRequests();
    }, []);

    const showActionMessage = (type, message) => {
        setActionMessage({ type, message, visible: true });
        setTimeout(() => {
            setActionMessage({ type: '', message: '', visible: false });
        }, 5000);
    };

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
            paid: { class: 'status-paid', text: 'Paid' },
            denied: { class: 'status-denied', text: 'Denied' },
            expired: { class: 'status-expired', text: 'Expired' },
            completed: { class: 'status-completed', text: 'Completed' }
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

    // Only show actual uploaded images - no placeholders
    const getFirstImage = (images) => {
        if (images && Array.isArray(images) && images.length > 0) {
            return images[0];
        }
        return null;
    };

    const filterRequestsByStatus = (status) => {
        if (status === 'denied') {
            // Combine denied and expired in the denied tab
            return requests.filter(request => request.status === 'denied' || request.status === 'expired');
        }
        return requests.filter(request => request.status === status);
    };

    const getTabCounts = () => {
        return {
            pending: filterRequestsByStatus('pending').length,
            approved: filterRequestsByStatus('approved').length,
            paid: filterRequestsByStatus('paid').length,
            completed: filterRequestsByStatus('completed').length,
            denied: requests.filter(r => r.status === 'denied' || r.status === 'expired').length
        };
    };

    const renderTabContent = () => {
        const filteredRequests = filterRequestsByStatus(activeTab);

        if (filteredRequests.length === 0) {
            const emptyMessages = {
                pending: "No pending requests. Your requests will appear here while waiting for approval.",
                approved: "No approved requests yet. Approved requests will show here with payment options.",
                paid: "No paid requests yet. Completed payments will be shown here with receipts.",
                completed: "No completed rentals yet. Finished rentals will appear here.",
                denied: "No denied or expired requests. Requests that were declined or expired will appear here with reasons."
            };

            return (
                <div className="empty-state">
                    <div className="empty-icon">
                        {activeTab === 'pending' ? '⏳' : activeTab === 'approved' ? '✅' : activeTab === 'paid' ? '💳' : activeTab === 'completed' ? '🎉' : '❌'}
                    </div>
                    <h3>No {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Requests</h3>
                    <p>{emptyMessages[activeTab]}</p>
                    {activeTab === 'pending' && (
                        <Link to="/rentals" className="browse-btn">
                            Browse Rentals
                        </Link>
                    )}
                </div>
            );
        }

        return (
            <div className="requests-grid">
                {filteredRequests.map(request => (
                    <div key={request.id} className="request-card">
                        <div className="request-image">
                            {getFirstImage(request.listing_images) ? (
                                <img
                                    src={getFirstImage(request.listing_images)}
                                    alt={request.listing_title}
                                />
                            ) : (
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: '#f3f4f6',
                                    color: '#9ca3af',
                                    fontSize: '12px'
                                }}>
                                    No image
                                </div>
                            )}
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
                                    ₹{request.listing_price_per_day}/day × {request.total_days} days
                                </span>
                                <span className="total-price">₹{request.total_price}</span>
                            </div>

                            {request.message && (
                                <div className="request-message">
                                    <span className="message-label">Your message:</span>
                                    <p>"{request.message}"</p>
                                </div>
                            )}

                            {(request.status === 'denied' || request.status === 'expired') && request.denial_reason && (
                                <div className="denial-reason">
                                    <span className="denial-label">{request.status === 'expired' ? 'Expiry reason:' : 'Reason for denial:'}</span>
                                    <p>"{request.denial_reason}"</p>
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

                                {/* Payment flow */}
                                {request.status === 'approved' && !request.payment_status && (
                                    <button
                                        className="pay-now-btn"
                                        onClick={() => handlePayNow(request)}
                                    >
                                        Pay Now
                                    </button>
                                )}

                                {/* Delivery option selection after payment */}
                                {request.status === 'paid' && !request.delivery_option && (
                                    <button
                                        className="choose-delivery-btn"
                                        onClick={() => setDeliveryOptionModal({ visible: true, request })}
                                    >
                                        🚚 Choose Delivery Method
                                    </button>
                                )}

                                {/* Delivery payment for delivery option */}
                                {request.status === 'paid' && request.delivery_option === 'delivery' && !request.delivery_paid && (
                                    <button
                                        className="pay-delivery-btn"
                                        onClick={() => setDeliveryPaymentModal({ visible: true, request, cost: request.delivery_cost })}
                                    >
                                        💳 Pay Delivery (₹{request.delivery_cost})
                                    </button>
                                )}

                                {/* Pickup confirmation for renter */}
                                {request.status === 'paid' && request.delivery_option === 'pickup' && !request.pickup_confirmed_by_renter && (
                                    <button
                                        className="confirm-pickup-btn"
                                        onClick={() => handleConfirmPickup(request.id)}
                                    >
                                        ✅ Confirm Pickup
                                    </button>
                                )}

                                {/* Rate after rental is completed */}
                                {request.status === 'completed' && !request.rated && (
                                    <button
                                        className="rate-btn"
                                        onClick={() => setRatingModal({ visible: true, request })}
                                    >
                                        ⭐ Rate Experience
                                    </button>
                                )}

                                {/* Track delivery - show until user confirms receipt */}
                                {request.status === 'paid' && request.delivery_option === 'delivery' && request.delivery_paid && !request.delivery_confirmed && (
                                    <button
                                        className="track-delivery-btn"
                                        onClick={() => setTrackingModal({ visible: true, requestId: request.id })}
                                    >
                                        📦 Track Delivery
                                    </button>
                                )}



                                {/* Initiate return after rental period and pickup/delivery confirmed */}
                                {request.status === 'paid' && ((request.delivery_option === 'delivery' && request.delivery_confirmed) || (request.delivery_option === 'pickup' && request.pickup_confirmed_by_lister)) && !request.return_initiated && new Date() > new Date(request.end_date) && (
                                    <>
                                        <button
                                            className="initiate-return-btn"
                                            onClick={() => setReturnModal({ visible: true, request })}
                                        >
                                            📤 Initiate Return (Required)
                                        </button>
                                        {(() => {
                                            const endDate = new Date(request.end_date);
                                            const now = new Date();
                                            const hoursPastEnd = (now - endDate) / (1000 * 60 * 60);
                                            const hoursRemaining = 36 - hoursPastEnd;

                                            if (hoursRemaining > 0) {
                                                return (
                                                    <div className="return-window-notice">
                                                        ⏰ Return within {Math.floor(hoursRemaining)}h to avoid late fees
                                                    </div>
                                                );
                                            } else {
                                                const hoursLate = Math.abs(hoursRemaining);
                                                return (
                                                    <div className="return-overdue-notice">
                                                        ⚠️ Overdue by {Math.floor(hoursLate)}h - Late fees apply!
                                                    </div>
                                                );
                                            }
                                        })()}
                                    </>
                                )}

                                {/* Track return delivery */}
                                {request.return_initiated && request.return_option === 'delivery' && request.return_delivery_status !== 'delivered' && (
                                    <button
                                        className="track-return-btn"
                                        onClick={() => setTrackingModal({ visible: true, requestId: request.id, isReturn: true })}
                                    >
                                        📦 Track Return
                                    </button>
                                )}

                                {/* Confirm return pickup for renter */}
                                {request.return_initiated && request.return_option === 'pickup' && !request.return_confirmed_by_renter && (
                                    <button
                                        className="confirm-return-btn"
                                        onClick={() => handleConfirmReturn(request.id)}
                                    >
                                        ✅ Confirm Self Return
                                    </button>
                                )}

                                {/* Show return status for self return */}
                                {request.return_initiated && request.return_option === 'pickup' && request.return_confirmed_by_renter && (
                                    <div className="return-completed">
                                        <span className="status-badge delivered">✅ Self Return Completed</span>
                                    </div>
                                )}

                                {request.status === 'approved' && request.payment_status === 'completed' && (
                                    <button
                                        className="view-receipt-btn"
                                        onClick={() => handleViewReceipt(request)}
                                    >
                                        View Receipt
                                    </button>
                                )}
                                {(request.status === 'approved' || request.status === 'pending') && (
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
        );
    };

    const handlePayNow = (request) => {
        setPaymentModal({ visible: true, request });
    };

    const handleViewReceipt = (request) => {
        setReceiptModal({ visible: true, request });
    };

    const handleDeliveryChosen = async (deliveryOption, cost, requiresPayment) => {
        setDeliveryOptionModal({ visible: false, request: null });

        if (requiresPayment) {
            showActionMessage('success', `Delivery option selected. Please complete payment of ₹${cost}`);
        } else {
            showActionMessage('success', 'Pickup option selected. Please coordinate with the lister.');
        }

        await fetchMyRequests();
    };

    const handleConfirmPickup = async (requestId) => {
        try {
            await fetch('/api/confirm-pickup-renter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId })
            });

            showActionMessage('success', 'Pickup confirmed! Waiting for lister confirmation.');
            await fetchMyRequests();
        } catch (error) {
            console.error('Error confirming pickup:', error);
            showActionMessage('error', 'Failed to confirm pickup');
        }
    };

    const handleConfirmReturn = async (requestId) => {
        try {
            await fetch('/api/confirm-return-renter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId })
            });

            showActionMessage('success', 'Return pickup confirmed! Waiting for lister confirmation.');
            await fetchMyRequests();
        } catch (error) {
            console.error('Error confirming return:', error);
            showActionMessage('error', 'Failed to confirm return');
        }
    };

    const handleRatingSubmitted = async () => {
        setRatingModal({ visible: false, request: null });
        showActionMessage('success', 'Thank you for your feedback!');
        await fetchMyRequests();
    };

    const handlePaymentSubmit = async (paymentData) => {
        try {
            // Validate payment data
            if (paymentData.method === 'card') {
                if (!paymentData.nameOnCard || !paymentData.cardNumber || !paymentData.expiryDate || !paymentData.cvv) {
                    showActionMessage('error', 'Please fill in all payment fields');
                    return;
                }
            }

            // Simulate payment processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update request status to paid
            const response = await fetch(`/api/rental-requests/${paymentModal.request.id}/payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_status: 'completed',
                    payment_method: paymentData.method,
                    transaction_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    payment_date: new Date().toISOString()
                })
            });

            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    // Update the request status to 'paid' in the local state
                    setRequests(prev => prev.map(req =>
                        req.id === paymentModal.request.id
                            ? { ...req, status: 'paid', payment_status: 'completed' }
                            : req
                    ));

                    // Close payment modal
                    setPaymentModal({ visible: false, request: null });

                    // Show receipt
                    const updatedRequest = {
                        ...paymentModal.request,
                        status: 'paid',
                        payment_status: 'completed',
                        transaction_id: data.request.transaction_id,
                        payment_date: data.request.payment_date
                    };
                    setReceiptModal({ visible: true, request: updatedRequest });
                    showActionMessage('success', 'Payment completed successfully!');
                } else {
                    showActionMessage('error', data.message || 'Payment processing failed');
                }
            } else {
                const errorData = await response.json();
                showActionMessage('error', errorData.message || 'Payment processing failed');
            }
        } catch (error) {
            console.error('Payment error:', error);
            showActionMessage('error', 'Payment processing failed. Please try again.');
        }
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

    const tabCounts = getTabCounts();

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
                            <h1 className="rentals-title">My Rental Requests</h1>
                        </div>
                    </div>

                    {/* Filters/Tabs Section */}
                    <div className="form-section">
                        <div className="tabs-container">
                            <div className="tabs">
                                {['pending', 'approved', 'paid', 'completed', 'denied'].map(tab => (
                                    <button
                                        key={tab}
                                        className={`tab ${activeTab === tab ? 'active' : ''}`}
                                        onClick={() => setActiveTab(tab)}
                                    >
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                        {tabCounts[tab] > 0 && (
                                            <span className="tab-count">{tabCounts[tab]}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {renderTabContent()}
                </div>
            </div>

            {/* Payment Modal */}
            {paymentModal.visible && (
                <PaymentModal
                    request={paymentModal.request}
                    onSubmit={handlePaymentSubmit}
                    onClose={() => setPaymentModal({ visible: false, request: null })}
                />
            )}

            {/* Receipt Modal */}
            {receiptModal.visible && (
                <ReceiptModal
                    request={receiptModal.request}
                    onClose={() => setReceiptModal({ visible: false, request: null })}
                />
            )}

            {/* Delivery Option Modal */}
            {deliveryOptionModal.visible && (
                <DeliveryOption
                    request={deliveryOptionModal.request}
                    onDeliveryChosen={handleDeliveryChosen}
                    onClose={() => setDeliveryOptionModal({ visible: false, request: null })}
                />
            )}

            {/* Delivery Payment Modal */}
            {deliveryPaymentModal.visible && (
                <DeliveryPaymentModal
                    request={deliveryPaymentModal.request}
                    cost={deliveryPaymentModal.cost}
                    onClose={() => setDeliveryPaymentModal({ visible: false, request: null, cost: 0 })}
                    onSuccess={async () => {
                        setDeliveryPaymentModal({ visible: false, request: null, cost: 0 });
                        showActionMessage('success', 'Delivery payment successful! Tracking your delivery...');
                        await fetchMyRequests();
                    }}
                />
            )}

            {/* Delivery Tracking Modal */}
            {trackingModal.visible && (
                <DeliveryTracking
                    requestId={trackingModal.requestId}
                    isReturn={trackingModal.isReturn || false}
                    onClose={async () => {
                        setTrackingModal({ visible: false, requestId: null });
                        await fetchMyRequests();
                    }}
                />
            )}

            {/* Rating Modal */}
            {ratingModal.visible && (
                <Rating
                    request={ratingModal.request}
                    onRatingSubmitted={handleRatingSubmitted}
                    onClose={() => setRatingModal({ visible: false, request: null })}
                />
            )}

            {/* Return Payment Modal */}
            {returnPaymentModal.visible && (
                <DeliveryPaymentModal
                    request={returnPaymentModal.request}
                    cost={returnPaymentModal.cost}
                    isReturn={true}
                    lateFeeInfo={returnPaymentModal.lateFeeInfo}
                    onClose={() => setReturnPaymentModal({ visible: false, request: null, cost: 0, lateFeeInfo: null })}
                    onSuccess={async () => {
                        setReturnPaymentModal({ visible: false, request: null, cost: 0, lateFeeInfo: null });
                        const lateFee = returnPaymentModal.lateFeeInfo?.lateFee || 0;
                        if (lateFee > 0) {
                            showActionMessage('success', `Return delivery payment successful! Late fee of ₹${lateFee} applied.`);
                        } else {
                            showActionMessage('success', 'Return delivery payment successful! Tracking your return...');
                        }
                        await fetchMyRequests();
                    }}
                />
            )}

            {/* Return Initiation Modal (reuses DeliveryOption) */}
            {returnModal.visible && (
                <DeliveryOption
                    request={returnModal.request}
                    isReturn={true}
                    onDeliveryChosen={async (option, cost, responseData) => {
                        setReturnModal({ visible: false, request: null });

                        // Check if late fee exists
                        const lateFee = responseData.lateFee || 0;
                        const hasLateFee = lateFee > 0;

                        // For delivery return: always show payment modal if cost > 0
                        // For pickup return: only show payment modal if late fee exists
                        if (option === 'delivery' && (cost > 0 || hasLateFee)) {
                            setReturnPaymentModal({
                                visible: true,
                                request: returnModal.request,
                                cost: cost,
                                lateFeeInfo: responseData
                            });
                        } else if (option === 'pickup' && hasLateFee) {
                            // Self return with late fee - show payment modal for late fee only
                            setReturnPaymentModal({
                                visible: true,
                                request: returnModal.request,
                                cost: 0, // No delivery cost for pickup
                                lateFeeInfo: responseData,
                                isLateFeeOnly: true
                            });
                        } else {
                            // No payment needed
                            showActionMessage('success', 'Self return initiated successfully - within 36-hour window');
                            await fetchMyRequests();
                        }
                    }}
                    onClose={() => setReturnModal({ visible: false, request: null })}
                />
            )}
        </>
    );
};

// Payment Modal Component
const PaymentModal = ({ request, onSubmit, onClose }) => {
    const [paymentData, setPaymentData] = useState({
        method: 'card',
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        nameOnCard: '',
        processing: false
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setPaymentData({ ...paymentData, processing: true });
        await onSubmit(paymentData);
        setPaymentData({ ...paymentData, processing: false });
    };

    const formatCardNumber = (value) => {
        return value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
    };

    const formatExpiryDate = (value) => {
        return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
    };

    return (
        <div className="modal-overlay">
            <div className="payment-modal">
                <div className="modal-header">
                    <h3>Complete Payment</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="payment-summary">
                    <h4>{request.listing_title}</h4>
                    <p>Duration: {request.total_days} day{request.total_days !== 1 ? 's' : ''}</p>
                    <div className="price-breakdown-detail">
                        <div className="breakdown-row">
                            <span>Rental Cost:</span>
                            <span>₹{request.total_price}</span>
                        </div>
                        <div className="breakdown-row">
                            <span>Platform Fee (10%):</span>
                            <span>₹{(request.total_price * 0.10).toFixed(2)}</span>
                        </div>
                        <div className="breakdown-row total">
                            <strong>Total Amount:</strong>
                            <strong>₹{calculateTotalWithFee(request.total_price)}</strong>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="payment-form">
                    <div className="form-group">
                        <label>Payment Method</label>
                        <select
                            value={paymentData.method}
                            onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                        >
                            <option value="card">Credit/Debit Card</option>
                            <option value="upi">UPI</option>
                            <option value="bank_transfer">Bank Transfer</option>
                        </select>
                    </div>

                    {paymentData.method === 'card' && (
                        <>
                            <div className="form-group">
                                <label>Name on Card</label>
                                <input
                                    type="text"
                                    value={paymentData.nameOnCard}
                                    onChange={(e) => setPaymentData({ ...paymentData, nameOnCard: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Card Number</label>
                                <input
                                    type="text"
                                    value={paymentData.cardNumber}
                                    onChange={(e) => setPaymentData({ ...paymentData, cardNumber: formatCardNumber(e.target.value) })}
                                    placeholder="1234 5678 9012 3456"
                                    maxLength={19}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Expiry Date</label>
                                    <input
                                        type="text"
                                        value={paymentData.expiryDate}
                                        onChange={(e) => setPaymentData({ ...paymentData, expiryDate: formatExpiryDate(e.target.value) })}
                                        placeholder="MM/YY"
                                        maxLength={5}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>CVV</label>
                                    <input
                                        type="text"
                                        value={paymentData.cvv}
                                        onChange={(e) => setPaymentData({ ...paymentData, cvv: e.target.value.replace(/\D/g, '') })}
                                        placeholder="123"
                                        maxLength={4}
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="btn btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-pay"
                            disabled={paymentData.processing}
                        >
                            {paymentData.processing ? 'Processing...' : `Pay ₹${request.total_price}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Receipt Modal Component
const ReceiptModal = ({ request, onClose }) => {
    const currentDate = new Date().toLocaleDateString();
    const transactionId = request.transaction_id || `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className="modal-overlay">
            <div className="receipt-modal">
                <div className="modal-header">
                    <h3>Payment Receipt</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="receipt-content">
                    <div className="receipt-header">
                        <div className="success-icon">✅</div>
                        <h4>Payment Successful!</h4>
                        <p>Your rental has been confirmed</p>
                    </div>

                    <div className="receipt-details">
                        <div className="receipt-section">
                            <h5>Rental Details</h5>
                            <div className="detail-row">
                                <span>Item:</span>
                                <span>{request.listing_title}</span>
                            </div>
                            <div className="detail-row">
                                <span>Owner:</span>
                                <span>{request.owner_name}</span>
                            </div>
                            <div className="detail-row">
                                <span>Duration:</span>
                                <span>{request.total_days} day{request.total_days !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="detail-row">
                                <span>Rate:</span>
                                <span>₹{request.listing_price_per_day}/day</span>
                            </div>
                        </div>

                        <div className="receipt-section">
                            <h5>Payment Information</h5>
                            <div className="detail-row">
                                <span>Transaction ID:</span>
                                <span>{transactionId}</span>
                            </div>
                            <div className="detail-row">
                                <span>Payment Date:</span>
                                <span>{currentDate}</span>
                            </div>
                            <div className="detail-row">
                                <span>Rental Cost:</span>
                                <span>₹{request.total_price}</span>
                            </div>
                            <div className="detail-row">
                                <span>Platform Fee (10%):</span>
                                <span>₹{(request.total_price * 0.10).toFixed(2)}</span>
                            </div>
                            <div className="detail-row total-row">
                                <span>Total Amount:</span>
                                <span>₹{calculateTotalWithFee(request.total_price)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="receipt-actions">
                        <button className="btn btn-primary" onClick={() => window.print()}>
                            Print Receipt
                        </button>
                        <button className="btn btn-cancel" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Delivery Payment Modal Component
const DeliveryPaymentModal = ({ request, cost, onClose, onSuccess, isReturn = false, lateFeeInfo = null, isLateFeeOnly = false }) => {
    const [processing, setProcessing] = useState(false);

    const handlePayment = async () => {
        setProcessing(true);
        try {
            // Simulate payment processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // For late fee only (self return), use a different endpoint
            const endpoint = isLateFeeOnly ? '/api/pay-late-fee' : (isReturn ? '/api/pay-return-delivery' : '/api/pay-delivery');
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: request.id,
                    transactionId: `${isLateFeeOnly ? 'LATEFEE' : (isReturn ? 'RETTXN' : 'DELVTXN')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                })
            });

            if (response.ok) {
                onSuccess();
            } else {
                throw new Error('Payment failed');
            }
        } catch (error) {
            console.error('Payment error:', error);
            alert('Payment failed. Please try again.');
            setProcessing(false);
        }
    };

    const lateFee = lateFeeInfo?.lateFee || 0;
    const totalCost = isLateFeeOnly ? lateFee.toFixed(2) : (isReturn && lateFee > 0 ? (parseFloat(cost) + parseFloat(lateFee)).toFixed(2) : cost);

    return (
        <div className="modal-overlay">
            <div className="payment-modal">
                <div className="modal-header">
                    <h3>{isReturn ? 'Pay for Return Delivery' : 'Pay for Delivery'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="payment-summary">
                    <h4>{isLateFeeOnly ? 'Late Fee Payment' : (isReturn ? 'Return Delivery Payment' : 'Delivery Payment')}</h4>
                    <p>{request.listing_title}</p>
                    <div className="price-breakdown-detail">
                        {!isLateFeeOnly && (
                            <div className="breakdown-row">
                                <span>{isReturn ? 'Return Delivery Cost:' : 'Delivery Cost:'}</span>
                                <span>₹{cost}</span>
                            </div>
                        )}
                        {lateFeeInfo?.lateFee > 0 && (
                            <div className="breakdown-row" style={{ color: '#e74c3c' }}>
                                <span>Late Fee ({lateFeeInfo.daysLate} day{lateFeeInfo.daysLate !== 1 ? 's' : ''}):</span>
                                <span>₹{lateFeeInfo.lateFee}</span>
                            </div>
                        )}
                        <div className="breakdown-row total">
                            <strong>Total:</strong>
                            <strong>₹{totalCost}</strong>
                        </div>
                    </div>
                    {isLateFeeOnly && (
                        <p style={{ fontSize: '13px', color: '#666', marginTop: '10px' }}>
                            ⚠️ You are returning after the 36-hour window. This late fee will be charged.
                        </p>
                    )}
                </div>

                <div className="modal-actions">
                    <button className="btn btn-cancel" onClick={onClose} disabled={processing}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-pay"
                        onClick={handlePayment}
                        disabled={processing}
                    >
                        {processing ? 'Processing...' : `Pay ₹${totalCost}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MyRentalRequests;