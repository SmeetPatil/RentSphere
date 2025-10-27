import React, { useState } from 'react';
import axios from 'axios';
import './Rentals.css';

const Rating = ({ request, onRatingSubmitted, onClose }) => {
    const [ratings, setRatings] = useState({
        itemQuality: 0,
        itemFunctionality: 0,
        valueForMoney: 0,
        ownerCommunication: 0,
        overallExperience: 0
    });
    const [review, setReview] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        const allRated = Object.values(ratings).every(r => r > 0);
        if (!allRated) {
            setError('Please provide all ratings');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await axios.post('/api/submit-rating', {
                requestId: request.id,
                itemQuality: ratings.itemQuality,
                itemFunctionality: ratings.itemFunctionality,
                valueForMoney: ratings.valueForMoney,
                ownerCommunication: ratings.ownerCommunication,
                overallExperience: ratings.overallExperience,
                review: review.trim()
            });

            onRatingSubmitted();
        } catch (error) {
            console.error('Error submitting rating:', error);
            setError(error.response?.data?.error || 'Failed to submit rating. Please try again.');
            setLoading(false);
        }
    };

    const updateRating = (category, value) => {
        setRatings(prev => ({ ...prev, [category]: value }));
    };

    const renderStars = (category, currentRating) => {
        return (
            <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span
                        key={star}
                        className={`star ${star <= currentRating ? 'active' : ''}`}
                        onClick={() => updateRating(category, star)}
                        style={{ cursor: 'pointer', fontSize: '24px' }}
                    >
                        {star <= currentRating ? '⭐' : '☆'}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content rating-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                
                <h2>⭐ Rate Your Rental Experience</h2>
                <p className="modal-subtitle">Your detailed feedback helps our community</p>

                {error && <div className="error-message">{error}</div>}

                <div className="rating-sections">
                    <div className="rating-section">
                        <h4>📦 Item Quality/Condition</h4>
                        <p style={{fontSize: '13px', color: '#666', marginBottom: '8px'}}>Was the item in good condition?</p>
                        {renderStars('itemQuality', ratings.itemQuality)}
                    </div>

                    <div className="rating-section">
                        <h4>⚙️ Item Functionality</h4>
                        <p style={{fontSize: '13px', color: '#666', marginBottom: '8px'}}>Did everything work as expected?</p>
                        {renderStars('itemFunctionality', ratings.itemFunctionality)}
                    </div>

                    <div className="rating-section">
                        <h4>💰 Value for Money</h4>
                        <p style={{fontSize: '13px', color: '#666', marginBottom: '8px'}}>Was it worth the rental price?</p>
                        {renderStars('valueForMoney', ratings.valueForMoney)}
                    </div>

                    <div className="rating-section">
                        <h4>💬 Owner Communication</h4>
                        <p style={{fontSize: '13px', color: '#666', marginBottom: '8px'}}>How responsive and helpful was the owner?</p>
                        {renderStars('ownerCommunication', ratings.ownerCommunication)}
                    </div>

                    <div className="rating-section">
                        <h4>🌟 Overall Experience</h4>
                        <p style={{fontSize: '13px', color: '#666', marginBottom: '8px'}}>How would you rate your overall experience?</p>
                        {renderStars('overallExperience', ratings.overallExperience)}
                    </div>

                    <div className="rating-section">
                        <h4>💭 Detailed Review (Optional)</h4>
                        <textarea
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            placeholder="Share your experience in detail... What did you like? Any suggestions for improvement?"
                            rows="4"
                            maxLength="500"
                            style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd'}}
                        />
                        <span className="char-count">{review.length}/500</span>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button 
                        className="btn-primary" 
                        onClick={handleSubmit}
                        disabled={loading || Object.values(ratings).some(r => r === 0)}
                    >
                        {loading ? 'Submitting...' : 'Submit Rating'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Rating;
