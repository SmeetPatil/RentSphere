import React, { useState } from 'react';
import axios from 'axios';
import './Rentals.css';

const Rating = ({ request, onRatingSubmitted, onClose }) => {
    const [rentalRating, setRentalRating] = useState(0);
    const [listerRating, setListerRating] = useState(0);
    const [rentalReview, setRentalReview] = useState('');
    const [listerReview, setListerReview] = useState('');
    const [hoveredRentalStar, setHoveredRentalStar] = useState(0);
    const [hoveredListerStar, setHoveredListerStar] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (rentalRating === 0 || listerRating === 0) {
            setError('Please provide ratings for both the rental item and the lister');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await axios.post('/api/submit-rating', {
                requestId: request.id,
                rentalRating,
                listerRating,
                rentalReview: rentalReview.trim(),
                listerReview: listerReview.trim()
            });

            onRatingSubmitted();
        } catch (error) {
            console.error('Error submitting rating:', error);
            setError(error.response?.data?.error || 'Failed to submit rating. Please try again.');
            setLoading(false);
        }
    };

    const renderStars = (rating, hoveredStar, onHover, onClick) => {
        return (
            <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span
                        key={star}
                        className={`star ${star <= (hoveredStar || rating) ? 'filled' : ''}`}
                        onMouseEnter={() => onHover(star)}
                        onMouseLeave={() => onHover(0)}
                        onClick={() => onClick(star)}
                    >
                        ★
                    </span>
                ))}
            </div>
        );
    };

    const getRatingLabel = (rating) => {
        switch(rating) {
            case 1: return 'Poor';
            case 2: return 'Fair';
            case 3: return 'Good';
            case 4: return 'Very Good';
            case 5: return 'Excellent';
            default: return 'Select rating';
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content rating-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                
                <h2>⭐ Rate Your Experience</h2>
                <p className="modal-subtitle">Help others make informed decisions</p>

                {error && <div className="error-message">{error}</div>}

                <div className="rating-sections">
                    {/* Rental Item Rating */}
                    <div className="rating-section">
                        <div className="rating-header">
                            <h3>📦 Rate the Rental Item</h3>
                            <p className="rating-label">{getRatingLabel(hoveredRentalStar || rentalRating)}</p>
                        </div>
                        
                        {renderStars(
                            rentalRating,
                            hoveredRentalStar,
                            setHoveredRentalStar,
                            setRentalRating
                        )}

                        <div className="form-group">
                            <label htmlFor="rentalReview">
                                Share your thoughts about the rental item (Optional)
                            </label>
                            <textarea
                                id="rentalReview"
                                value={rentalReview}
                                onChange={(e) => setRentalReview(e.target.value)}
                                placeholder="How was the condition of the item? Did it meet your expectations? Any issues?"
                                rows="4"
                                maxLength="500"
                            />
                            <span className="char-count">{rentalReview.length}/500</span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="rating-divider"></div>

                    {/* Lister Rating */}
                    <div className="rating-section">
                        <div className="rating-header">
                            <h3>👤 Rate the Lister</h3>
                            <p className="rating-label">{getRatingLabel(hoveredListerStar || listerRating)}</p>
                        </div>
                        
                        {renderStars(
                            listerRating,
                            hoveredListerStar,
                            setHoveredListerStar,
                            setListerRating
                        )}

                        <div className="form-group">
                            <label htmlFor="listerReview">
                                Share your thoughts about the lister (Optional)
                            </label>
                            <textarea
                                id="listerReview"
                                value={listerReview}
                                onChange={(e) => setListerReview(e.target.value)}
                                placeholder="How was the communication? Were they helpful? Would you rent from them again?"
                                rows="4"
                                maxLength="500"
                            />
                            <span className="char-count">{listerReview.length}/500</span>
                        </div>
                    </div>
                </div>

                {/* Guidelines */}
                <div className="rating-guidelines">
                    <h4>📝 Rating Guidelines</h4>
                    <ul>
                        <li>Be honest and constructive in your feedback</li>
                        <li>Focus on the rental experience and item quality</li>
                        <li>Avoid personal attacks or inappropriate language</li>
                        <li>Your ratings help build trust in our community</li>
                    </ul>
                </div>

                {/* Action Buttons */}
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button 
                        className="btn-primary" 
                        onClick={handleSubmit}
                        disabled={loading || rentalRating === 0 || listerRating === 0}
                    >
                        {loading ? 'Submitting...' : 'Submit Rating'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Rating;
