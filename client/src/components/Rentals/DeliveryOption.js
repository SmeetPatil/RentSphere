import React, { useState } from 'react';
import axios from 'axios';
import './RentalRequest.css';
import './DeliveryOption.css';

const DeliveryOption = ({ request, onDeliveryChosen, onClose }) => {
    const [deliveryOption, setDeliveryOption] = useState('pickup');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryLat, setDeliveryLat] = useState(null);
    const [deliveryLon, setDeliveryLon] = useState(null);
    const [deliveryCost, setDeliveryCost] = useState(0);
    const [distance, setDistance] = useState(0);
    const [costBreakdown, setCostBreakdown] = useState(null);
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [error, setError] = useState('');

    // Get coordinates from address using geocoding via backend
    const geocodeAddress = async (address) => {
        try {
            // Use backend proxy to avoid CORS issues
            const response = await axios.post('/api/geocode-address', {
                address: address
            });
            
            if (response.data && response.data.lat && response.data.lon) {
                return {
                    lat: response.data.lat,
                    lon: response.data.lon
                };
            }
            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    };

    const calculateDeliveryCost = async () => {
        if (!deliveryAddress.trim()) {
            setError('Please enter a delivery address');
            return;
        }

        setCalculating(true);
        setError('');

        try {
            console.log('Geocoding address:', deliveryAddress);
            // Get coordinates for delivery address
            const coords = await geocodeAddress(deliveryAddress);
            
            if (!coords) {
                setError('Unable to find address. Please enter a valid address.');
                setCalculating(false);
                return;
            }

            console.log('Coordinates found:', coords);
            setDeliveryLat(coords.lat);
            setDeliveryLon(coords.lon);

            // Calculate delivery cost
            console.log('Calculating cost for listing:', request.listing_id);
            const response = await axios.post('/api/calculate-delivery-cost', {
                rentalId: request.listing_id,
                deliveryAddress: deliveryAddress,
                deliveryLat: coords.lat,
                deliveryLon: coords.lon
            });

            console.log('Cost calculated:', response.data);
            setDistance(response.data.distance);
            setDeliveryCost(response.data.deliveryCost);
            setCostBreakdown(response.data.breakdown);
            setCalculating(false);
        } catch (error) {
            console.error('Error calculating delivery cost:', error);
            setError(error.response?.data?.error || 'Failed to calculate delivery cost. Please try again.');
            setCalculating(false);
        }
    };

    const handleSubmit = async () => {
        if (deliveryOption === 'delivery' && !deliveryAddress.trim()) {
            setError('Please enter a delivery address');
            return;
        }

        if (deliveryOption === 'delivery' && (!deliveryLat || !deliveryLon)) {
            setError('Please calculate delivery cost first');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/choose-delivery-option', {
                requestId: request.id,
                deliveryOption: deliveryOption,
                deliveryAddress: deliveryOption === 'delivery' ? deliveryAddress : null,
                deliveryCost: deliveryOption === 'delivery' ? deliveryCost : 0,
                distance: deliveryOption === 'delivery' ? distance : 0,
                deliveryLat: deliveryOption === 'delivery' ? deliveryLat : null,
                deliveryLon: deliveryOption === 'delivery' ? deliveryLon : null
            });

            if (response.data.requiresPayment) {
                // Navigate to delivery payment
                onDeliveryChosen(deliveryOption, deliveryCost, true);
            } else {
                // Pickup - no payment needed, just wait for confirmation
                onDeliveryChosen(deliveryOption, 0, false);
            }
        } catch (error) {
            console.error('Error choosing delivery option:', error);
            setError(error.response?.data?.error || 'Failed to save delivery option');
            setLoading(false);
        }
    };

    return (
        <div className="rental-request-overlay">
            <div className="rental-request-modal delivery-option-modal">
                {/* Header */}
                <div className="modal-header">
                    <h2>🚚 Choose Delivery Method</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                {/* Listing Summary */}
                <div className="listing-summary">
                    <h3>{request.listing_title}</h3>
                    <p className="subtitle">Select how you'd like to receive your rental</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="delivery-error-alert">
                        <span className="error-icon">⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* Content */}
                <div className="delivery-options-content">
                    {/* Delivery Options Grid */}
                    <div className="delivery-options-grid">
                        {/* Pickup Option */}
                        <div 
                            className={`delivery-choice-card ${deliveryOption === 'pickup' ? 'selected' : ''}`}
                            onClick={() => setDeliveryOption('pickup')}
                        >
                            <div className="choice-icon">📦</div>
                            <h3>Self Pickup</h3>
                            <p className="choice-description">Pick up the item directly from the lister</p>
                            <div className="choice-cost free">FREE</div>
                            <ul className="choice-features">
                                <li>✓ No delivery charges</li>
                                <li>✓ Meet the lister in person</li>
                                <li>✓ Inspect item before taking</li>
                            </ul>
                        </div>

                        {/* Delivery Option */}
                        <div 
                            className={`delivery-choice-card ${deliveryOption === 'delivery' ? 'selected' : ''}`}
                            onClick={() => setDeliveryOption('delivery')}
                        >
                            <div className="choice-icon">🚚</div>
                            <h3>Home Delivery</h3>
                            <p className="choice-description">Get the item delivered to your doorstep</p>
                            {deliveryCost > 0 ? (
                                <div className="choice-cost">₹{deliveryCost.toFixed(2)}</div>
                            ) : (
                                <div className="choice-cost placeholder">Calculate cost below</div>
                            )}
                            <ul className="choice-features">
                                <li>✓ Delivered to your address</li>
                                <li>✓ Real-time tracking</li>
                                <li>✓ Secure handling</li>
                            </ul>
                        </div>
                    </div>

                    {/* Delivery Address Section */}
                    {deliveryOption === 'delivery' && (
                        <div className="delivery-address-form">
                            <h4>Delivery Address</h4>
                            <div className="form-field">
                                <label htmlFor="deliveryAddress">Full Address *</label>
                                <textarea
                                    id="deliveryAddress"
                                    value={deliveryAddress}
                                    onChange={(e) => {
                                        setDeliveryAddress(e.target.value);
                                        // Reset calculated values when address changes
                                        setDeliveryCost(0);
                                        setDistance(0);
                                        setCostBreakdown(null);
                                        setDeliveryLat(null);
                                        setDeliveryLon(null);
                                    }}
                                    placeholder="Enter your complete delivery address&#10;(House/Flat, Street, Area, City, Pincode)"
                                    rows="3"
                                    required
                                />
                            </div>

                            <button 
                                className="btn-calculate"
                                onClick={calculateDeliveryCost}
                                disabled={calculating || !deliveryAddress.trim()}
                            >
                                {calculating ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        Calculating...
                                    </>
                                ) : (
                                    '📊 Calculate Delivery Cost'
                                )}
                            </button>

                            {/* Cost Breakdown */}
                            {costBreakdown && distance > 0 && (
                                <div className="cost-breakdown-card">
                                    <h4>💰 Cost Breakdown</h4>
                                    <div className="breakdown-grid">
                                        <div className="breakdown-row">
                                            <span>Distance:</span>
                                            <span className="breakdown-value">{distance.toFixed(2)} km</span>
                                        </div>
                                        <div className="breakdown-row">
                                            <span>Base Cost:</span>
                                            <span className="breakdown-value">₹{costBreakdown.baseCost.toFixed(2)}</span>
                                        </div>
                                        <div className="breakdown-row">
                                            <span>Distance Charges:</span>
                                            <span className="breakdown-value">₹{costBreakdown.distanceCost.toFixed(2)}</span>
                                        </div>
                                        {costBreakdown.itemSurcharge > 0 && (
                                            <div className="breakdown-row">
                                                <span>Heavy/Sensitive Item:</span>
                                                <span className="breakdown-value">₹{costBreakdown.itemSurcharge.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="breakdown-row total">
                                            <span><strong>Total Delivery Cost:</strong></span>
                                            <span className="breakdown-value"><strong>₹{deliveryCost.toFixed(2)}</strong></span>
                                        </div>
                                    </div>
                                    <p className="pricing-note">
                                        💡 Pricing: ₹10 base + ₹10/km (up to 10km) + ₹20/km (beyond 10km)
                                        {costBreakdown.itemSurcharge > 0 && ' + Heavy item surcharge'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button 
                        className="btn-primary" 
                        onClick={handleSubmit}
                        disabled={loading || (deliveryOption === 'delivery' && (!deliveryLat || !deliveryLon))}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-small"></span>
                                Processing...
                            </>
                        ) : (
                            deliveryOption === 'delivery' ? 
                                `Proceed to Payment (₹${deliveryCost.toFixed(2)})` : 
                                'Confirm Pickup'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeliveryOption;
