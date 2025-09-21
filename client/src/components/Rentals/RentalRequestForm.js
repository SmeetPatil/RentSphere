import React, { useState, useEffect } from 'react';
import './RentalRequest.css';

const RentalRequestForm = ({ listing, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        message: ''
    });
    const [totalDays, setTotalDays] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successData, setSuccessData] = useState(null);

    // Calculate total days and price when dates change
    useEffect(() => {
        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            
            if (end > start) {
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                setTotalDays(days);
                setTotalPrice(days * listing.price_per_day);
            } else {
                setTotalDays(0);
                setTotalPrice(0);
            }
        } else {
            setTotalDays(0);
            setTotalPrice(0);
        }
    }, [formData.startDate, formData.endDate, listing.price_per_day]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            // Validate dates
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = new Date(formData.startDate);
            const endDate = new Date(formData.endDate);

            if (startDate < today) {
                throw new Error('Start date cannot be in the past');
            }

            if (endDate <= startDate) {
                throw new Error('End date must be after start date');
            }

            const response = await fetch('/api/rental-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    listingId: listing.id,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    message: formData.message
                })
            });

            const data = await response.json();

            if (data.success) {
                setSuccessData({
                    requestId: data.rentalRequest.id,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    totalDays: totalDays,
                    totalPrice: totalPrice,
                    listingTitle: listing.title
                });
                onSuccess && onSuccess(data.rentalRequest);
                // Don't close immediately, let user see the success message
            } else {
                throw new Error(data.message || 'Failed to submit rental request');
            }
        } catch (error) {
            console.error('Error submitting rental request:', error);
            setError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get minimum date (tomorrow)
    const getMinDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    // Get minimum end date (day after start date)
    const getMinEndDate = () => {
        if (!formData.startDate) return getMinDate();
        const startDate = new Date(formData.startDate);
        startDate.setDate(startDate.getDate() + 1);
        return startDate.toISOString().split('T')[0];
    };

    return (
        <div className="rental-request-overlay">
            <div className="rental-request-modal">
                <div className="modal-header">
                    <h2>{successData ? 'Request Submitted!' : 'Request to Rent'}</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                {successData ? (
                    // Success State
                    <div className="success-content">
                        <div className="success-icon">
                            <div className="checkmark">✓</div>
                        </div>
                        
                        <h3>Rental Request Submitted Successfully!</h3>
                        <p className="success-message">
                            Your request to rent <strong>{successData.listingTitle}</strong> has been sent to the owner.
                        </p>

                        <div className="request-summary">
                            <h4>Request Details:</h4>
                            <div className="detail-row">
                                <span>Rental Period:</span>
                                <span>{new Date(successData.startDate).toLocaleDateString()} - {new Date(successData.endDate).toLocaleDateString()}</span>
                            </div>
                            <div className="detail-row">
                                <span>Duration:</span>
                                <span>{successData.totalDays} day{successData.totalDays !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="detail-row">
                                <span>Total Cost:</span>
                                <span className="price-highlight">${successData.totalPrice}</span>
                            </div>
                        </div>

                        <div className="next-steps">
                            <h4>What's Next?</h4>
                            <ul>
                                <li>The owner will review your request</li>
                                <li>You'll receive a notification when they respond</li>
                                <li>Check your rental requests in the dashboard</li>
                            </ul>
                        </div>

                        <div className="success-actions">
                            <button onClick={onClose} className="close-success-button">
                                Continue Browsing
                            </button>
                            <a href="/my-rental-requests" className="view-requests-button">
                                View My Requests
                            </a>
                        </div>
                    </div>
                ) : (
                    // Normal Form State
                    <>
                        <div className="listing-summary">
                            <h3>{listing.title}</h3>
                            <p className="price">${listing.price_per_day}/day</p>
                            <p className="category">{listing.category}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="rental-request-form">
                    <div className="date-section">
                        <div className="date-field">
                            <label htmlFor="startDate">Start Date</label>
                            <input
                                type="date"
                                id="startDate"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleInputChange}
                                min={getMinDate()}
                                required
                            />
                        </div>

                        <div className="date-field">
                            <label htmlFor="endDate">End Date</label>
                            <input
                                type="date"
                                id="endDate"
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleInputChange}
                                min={getMinEndDate()}
                                required
                            />
                        </div>
                    </div>

                    {totalDays > 0 && (
                        <div className="price-calculation">
                            <div className="calculation-row">
                                <span>{totalDays} day{totalDays !== 1 ? 's' : ''} × ${listing.price_per_day}/day</span>
                                <span className="total-price">${totalPrice}</span>
                            </div>
                        </div>
                    )}

                    <div className="message-section">
                        <label htmlFor="message">Message to Owner (Optional)</label>
                        <textarea
                            id="message"
                            name="message"
                            value={formData.message}
                            onChange={handleInputChange}
                            placeholder="Tell the owner why you'd like to rent this item, when you'll pick it up, etc."
                            rows="4"
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="cancel-button">
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="submit-button"
                            disabled={isSubmitting || totalDays === 0}
                        >
                            {isSubmitting ? 'Submitting...' : `Request Rental - $${totalPrice}`}
                        </button>
                    </div>
                </form>
                </>
                )}
            </div>
        </div>
    );
};

export default RentalRequestForm;