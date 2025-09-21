import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();

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
                onSuccess && onSuccess(data.rentalRequest);
                alert('Rental request submitted successfully! The owner will review your request.');
                onClose();
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
                    <h2>Request to Rent</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

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
            </div>
        </div>
    );
};

export default RentalRequestForm;