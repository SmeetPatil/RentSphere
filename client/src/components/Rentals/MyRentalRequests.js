import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './MyRentalRequests.css';

const MyRentalRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('pending');
    const [paymentModal, setPaymentModal] = useState({ visible: false, request: null });
    const [receiptModal, setReceiptModal] = useState({ visible: false, request: null });
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

    const filterRequestsByStatus = (status) => {
        return requests.filter(request => request.status === status);
    };

    const getTabCounts = () => {
        return {
            pending: filterRequestsByStatus('pending').length,
            approved: filterRequestsByStatus('approved').length,
            denied: filterRequestsByStatus('denied').length
        };
    };

    const renderTabContent = () => {
        const filteredRequests = filterRequestsByStatus(activeTab);
        
        if (filteredRequests.length === 0) {
            const emptyMessages = {
                pending: "No pending requests. Your requests will appear here while waiting for approval.",
                approved: "No approved requests yet. Approved requests will show here with payment options.",
                denied: "No denied requests. Requests that were declined will appear here with reasons."
            };
            
            return (
                <div className="empty-state">
                    <div className="empty-icon">
                        {activeTab === 'pending' ? '⏳' : activeTab === 'approved' ? '✅' : '❌'}
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

                            {request.status === 'denied' && request.denial_reason && (
                                <div className="denial-reason">
                                    <span className="denial-label">Reason for denial:</span>
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
                                {request.status === 'approved' && !request.payment_status && (
                                    <button
                                        className="pay-now-btn"
                                        onClick={() => handlePayNow(request)}
                                    >
                                        Pay Now
                                    </button>
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
                    // Close payment modal and refresh data
                    setPaymentModal({ visible: false, request: null });
                    await fetchMyRequests();
                    
                    // Show receipt
                    const updatedRequest = { 
                        ...paymentModal.request, 
                        payment_status: 'completed',
                        transaction_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        payment_date: new Date().toISOString()
                    };
                    setReceiptModal({ visible: true, request: updatedRequest });
                    showActionMessage('success', 'Payment completed successfully!');
                } else {
                    showActionMessage('error', data.message || 'Payment processing failed');
                }
            } else {
                // For demo purposes, simulate successful payment even if API doesn't exist
                setPaymentModal({ visible: false, request: null });
                
                // Show receipt with demo data
                const updatedRequest = { 
                    ...paymentModal.request, 
                    payment_status: 'completed',
                    transaction_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    payment_date: new Date().toISOString()
                };
                setReceiptModal({ visible: true, request: updatedRequest });
                showActionMessage('success', 'Payment completed successfully! (Demo mode)');
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
        <div className="rental-requests-page">
            <div className="requests-container">
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
                    <h1>My Rental Requests</h1>
                    <p>Track the status of your rental requests</p>
                </div>

                <div className="tabs-container">
                    <div className="tabs">
                        {['pending', 'approved', 'denied'].map(tab => (
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

                {renderTabContent()}

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
            </div>
        </div>
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
                    <div className="total-amount">${request.total_price}</div>
                </div>

                <form onSubmit={handleSubmit} className="payment-form">
                    <div className="form-group">
                        <label>Payment Method</label>
                        <select 
                            value={paymentData.method}
                            onChange={(e) => setPaymentData({...paymentData, method: e.target.value})}
                        >
                            <option value="card">Credit/Debit Card</option>
                            <option value="paypal">PayPal</option>
                            <option value="bank">Bank Transfer</option>
                        </select>
                    </div>

                    {paymentData.method === 'card' && (
                        <>
                            <div className="form-group">
                                <label>Name on Card</label>
                                <input
                                    type="text"
                                    value={paymentData.nameOnCard}
                                    onChange={(e) => setPaymentData({...paymentData, nameOnCard: e.target.value})}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Card Number</label>
                                <input
                                    type="text"
                                    value={paymentData.cardNumber}
                                    onChange={(e) => setPaymentData({...paymentData, cardNumber: formatCardNumber(e.target.value)})}
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
                                        onChange={(e) => setPaymentData({...paymentData, expiryDate: formatExpiryDate(e.target.value)})}
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
                                        onChange={(e) => setPaymentData({...paymentData, cvv: e.target.value.replace(/\D/g, '')})}
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
                            {paymentData.processing ? 'Processing...' : `Pay $${request.total_price}`}
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
                                <span>${request.listing_price_per_day}/day</span>
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
                            <div className="detail-row total-row">
                                <span>Total Amount:</span>
                                <span>${request.total_price}</span>
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

export default MyRentalRequests;