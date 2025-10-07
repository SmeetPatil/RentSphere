const express = require('express');
const router = express.Router();
const db = require('../database');
const { isLoggedIn } = require('../middleware/auth');
const axios = require('axios');

// Geocoding endpoint (proxy to avoid CORS issues)
router.post('/geocode-address', isLoggedIn, async (req, res) => {
    console.log('🌍 Geocode endpoint hit!');
    console.log('Address to geocode:', req.body.address);
    try {
        const { address } = req.body;
        
        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }

        // Call OpenStreetMap Nominatim API from backend
        const response = await axios.get(
            `https://nominatim.openstreetmap.org/search`,
            {
                params: {
                    format: 'json',
                    q: address
                },
                headers: {
                    'User-Agent': 'RentSphere/1.0' // Required by Nominatim
                }
            }
        );
        
        if (response.data && response.data.length > 0) {
            res.json({
                lat: parseFloat(response.data[0].lat),
                lon: parseFloat(response.data[0].lon)
            });
        } else {
            res.status(404).json({ error: 'Address not found' });
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        res.status(500).json({ error: 'Failed to geocode address' });
    }
});

// Calculate delivery cost based on distance and item category
function calculateDeliveryCost(distance, category) {
    let baseCost = 10;
    let distanceCost = 0;
    
    // Calculate distance-based cost
    if (distance <= 10) {
        distanceCost = distance * 10;
    } else {
        distanceCost = (10 * 10) + ((distance - 10) * 20);
    }
    
    // Add heavy/sensitive item surcharge
    let itemSurcharge = 0;
    const heavyItems = {
        'tvs': 150,
        'drones': 80,
        'large speakers': 100
    };
    
    const normalizedCategory = category.toLowerCase();
    for (const [item, surcharge] of Object.entries(heavyItems)) {
        if (normalizedCategory.includes(item) || normalizedCategory === item) {
            itemSurcharge = surcharge;
            break;
        }
    }
    
    return baseCost + distanceCost + itemSurcharge;
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
}

// Calculate delivery cost endpoint
router.post('/calculate-delivery-cost', isLoggedIn, async (req, res) => {
    console.log('🚚 Calculate delivery cost endpoint hit!');
    console.log('Request body:', req.body);
    try {
        const { rentalId, deliveryAddress, deliveryLat, deliveryLon } = req.body;
        
        // Get rental location
        const rental = await db.query(
            'SELECT latitude, longitude, category FROM listings WHERE id = $1',
            [rentalId]
        );
        
        if (rental.rows.length === 0) {
            return res.status(404).json({ error: 'Rental not found' });
        }
        
        const { latitude, longitude, category } = rental.rows[0];
        
        // Calculate distance
        const distance = calculateDistance(latitude, longitude, deliveryLat, deliveryLon);
        
        // Calculate cost
        const deliveryCost = calculateDeliveryCost(distance, category);
        
        res.json({
            distance: parseFloat(distance.toFixed(2)),
            deliveryCost: parseFloat(deliveryCost.toFixed(2)),
            breakdown: {
                baseCost: 10,
                distanceCost: distance <= 10 ? distance * 10 : (10 * 10) + ((distance - 10) * 20),
                itemSurcharge: deliveryCost - 10 - (distance <= 10 ? distance * 10 : (10 * 10) + ((distance - 10) * 20))
            }
        });
    } catch (error) {
        console.error('Error calculating delivery cost:', error);
        res.status(500).json({ error: 'Failed to calculate delivery cost' });
    }
});

// Choose delivery option (pickup or delivery)
router.post('/choose-delivery-option', isLoggedIn, async (req, res) => {
    console.log('📦 Choose delivery option endpoint hit!');
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    try {
        const { requestId, deliveryOption, deliveryAddress, deliveryCost, distance, deliveryLat, deliveryLon } = req.body;
        
        if (!requestId) {
            return res.status(400).json({ error: 'Request ID is required' });
        }
        
        // Verify request belongs to user
        const request = await db.query(
            'SELECT * FROM rental_requests WHERE id = $1 AND renter_user_id = $2',
            [requestId, req.user.id]
        );
        
        console.log('Request found:', request.rows);
        
        if (request.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        console.log('Request status:', request.rows[0].status, 'Payment status:', request.rows[0].payment_status);
        console.log('Distance to store:', distance, 'km');
        
        // Update delivery option with distance
        const updateResult = await db.query(
            `UPDATE rental_requests 
             SET delivery_option = $1, delivery_cost = $2, distance_km = $3, 
                 delivery_address = $4, delivery_lat = $5, delivery_lon = $6
             WHERE id = $7
             RETURNING *`,
            [deliveryOption, deliveryCost || 0, distance || 0, 
             deliveryAddress || null, deliveryLat || null, deliveryLon || null, requestId]
        );
        
        console.log('Update result - distance_km:', updateResult.rows[0].distance_km);
        
        res.json({ 
            message: 'Delivery option updated successfully',
            deliveryOption,
            deliveryCost: deliveryCost || 0,
            distance: distance || 0,
            requiresPayment: deliveryOption === 'delivery' && deliveryCost > 0
        });
    } catch (error) {
        console.error('Error updating delivery option:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to update delivery option', details: error.message });
    }
});

// Process delivery payment
router.post('/pay-delivery', isLoggedIn, async (req, res) => {
    try {
        const { requestId, transactionId } = req.body;
        
        const request = await db.query(
            'SELECT rr.*, r.category FROM rental_requests rr JOIN rentals r ON r.id = rr.listing_id WHERE rr.id = $1 AND rr.renter_user_id = $2',
            [requestId, req.user.id]
        );
        
        if (request.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        const requestData = request.rows[0];
        const distance = requestData.distance_km || 10;
        
        // Calculate FIXED delivery times based on distance (these won't change)
        const enRouteMinutes = Math.max(60, 90 + Math.random() * 30); // 1-1.5 hours
        const totalDeliveryMinutes = Math.max(180, distance * 15 + Math.random() * 60); // 3-12 hours based on distance
        
        const now = new Date();
        const expectedEnRouteAt = new Date(now.getTime() + enRouteMinutes * 60 * 1000);
        const expectedDeliveredAt = new Date(now.getTime() + totalDeliveryMinutes * 60 * 1000);
        
        console.log(`🚚 Setting up delivery for request ${requestId}:`);
        console.log(`   Distance: ${distance} km`);
        console.log(`   En route in: ${enRouteMinutes.toFixed(1)} minutes`);
        console.log(`   Delivered in: ${totalDeliveryMinutes.toFixed(1)} minutes`);
        console.log(`   Expected en route at: ${expectedEnRouteAt.toISOString()}`);
        console.log(`   Expected delivered at: ${expectedDeliveredAt.toISOString()}`);
        
        // Mark delivery as paid and initiate delivery with calculated times
        await db.query(
            `UPDATE rental_requests 
             SET delivery_paid = TRUE, 
                 delivery_status = 'shipped', 
                 delivery_shipped_at = CURRENT_TIMESTAMP,
                 expected_en_route_at = $2,
                 expected_delivered_at = $3
             WHERE id = $1`,
            [requestId, expectedEnRouteAt, expectedDeliveredAt]
        );
        
        // Create delivery event
        await db.query(
            `INSERT INTO delivery_events (rental_request_id, event_type, description, event_time)
             VALUES ($1, 'shipped', 'Your order has been shipped and is being prepared for delivery', CURRENT_TIMESTAMP)`,
            [requestId]
        );
        
        res.json({ 
            message: 'Delivery payment successful', 
            status: 'shipped',
            expectedEnRouteAt: expectedEnRouteAt.toISOString(),
            expectedDeliveredAt: expectedDeliveredAt.toISOString()
        });
    } catch (error) {
        console.error('Error processing delivery payment:', error);
        res.status(500).json({ error: 'Failed to process delivery payment' });
    }
});

// Simulate delivery progression
async function simulateDelivery(requestId, category) {
    try {
        // Get rental request details including distance
        const request = await db.query(
            `SELECT rr.*, r.category 
             FROM rental_requests rr
             JOIN listings r ON r.id = rr.listing_id
             WHERE rr.id = $1`,
            [requestId]
        );
        
        if (request.rows.length === 0) {
            console.error('Request not found for delivery simulation');
            return;
        }
        
        const deliveryDistance = parseFloat(request.rows[0].delivery_cost) || 10; // Use cost as proxy for distance
        const categoryName = request.rows[0].category || '';
        
        // Calculate base time from distance (purely distance-based)
        // Formula: 3 hours base + (distance * 20 minutes per km)
        // This gives roughly 3-4 hours for 5km, 6-7 hours for 10km, 9-10 hours for 20km
        let baseMinutes = 180 + (deliveryDistance * 20);
        
        // Add multiplier for heavy/sensitive items (10-30% additional time)
        const heavyItems = ['tv', 'drone', 'speaker', 'camera', 'laptop', 'gaming'];
        const isHeavyOrSensitive = heavyItems.some(item => categoryName.toLowerCase().includes(item));
        
        if (isHeavyOrSensitive) {
            baseMinutes *= (1.1 + Math.random() * 0.2); // 10-30% extra time
        }
        
        // Add small random variation (±10%)
        const totalMinutes = baseMinutes * (0.9 + Math.random() * 0.2);
        
        // Enforce limits: minimum 3 hours, maximum 12 hours
        const finalMinutes = Math.max(180, Math.min(720, totalMinutes));
        
        console.log(`🚚 Delivery simulation for request ${requestId}:`);
        console.log(`   Distance proxy: ${deliveryDistance}km`);
        console.log(`   Category: ${categoryName}`);
        console.log(`   Heavy/Sensitive: ${isHeavyOrSensitive}`);
        console.log(`   Total delivery time: ${Math.round(finalMinutes)} minutes (${(finalMinutes / 60).toFixed(1)} hours)`);
        
        // Schedule en_route status (40-60% of total time)
        const enRouteDelay = finalMinutes * (0.4 + Math.random() * 0.2);
        setTimeout(async () => {
            await db.query(
                `UPDATE rental_requests 
                 SET delivery_status = 'en_route', delivery_en_route_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [requestId]
            );
            
            await db.query(
                `INSERT INTO delivery_events (rental_request_id, event_type, description, event_time)
                 VALUES ($1, 'en_route', 'Your order is out for delivery and will reach you soon', CURRENT_TIMESTAMP)`,
                [requestId]
            );
        }, enRouteDelay * 60 * 1000);
        
        // Schedule delivered status
        setTimeout(async () => {
            await db.query(
                `UPDATE rental_requests 
                 SET delivery_status = 'delivered', delivery_delivered_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [requestId]
            );
            
            await db.query(
                `INSERT INTO delivery_events (rental_request_id, event_type, description, event_time)
                 VALUES ($1, 'delivered', 'Your order has been delivered successfully', CURRENT_TIMESTAMP)`,
                [requestId]
            );
        }, finalMinutes * 60 * 1000);
        
    } catch (error) {
        console.error('Error simulating delivery:', error);
    }
}

// Get delivery tracking status
router.get('/delivery-tracking/:requestId', isLoggedIn, async (req, res) => {
    try {
        const { requestId } = req.params;
        
        const request = await db.query(
            `SELECT rr.*, r.title, r.category 
             FROM rental_requests rr
             JOIN listings r ON rr.listing_id = r.id
             WHERE rr.id = $1 AND (rr.renter_user_id = $2 OR r.user_id = $2)`,
            [requestId, req.user.id]
        );
        
        if (request.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        // Get delivery events
        const events = await db.query(
            `SELECT * FROM delivery_events 
             WHERE rental_request_id = $1 
             ORDER BY event_time ASC`,
            [requestId]
        );
        
        res.json({
            request: request.rows[0],
            events: events.rows
        });
    } catch (error) {
        console.error('Error fetching delivery tracking:', error);
        res.status(500).json({ error: 'Failed to fetch delivery tracking' });
    }
});

// Confirm pickup by renter
router.post('/confirm-pickup-renter', isLoggedIn, async (req, res) => {
    try {
        const { requestId } = req.body;
        
        const request = await db.query(
            'SELECT * FROM rental_requests WHERE id = $1 AND renter_user_id = $2',
            [requestId, req.user.id]
        );
        
        if (request.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        await db.query(
            'UPDATE rental_requests SET pickup_confirmed_by_renter = TRUE WHERE id = $1',
            [requestId]
        );
        
        // Check if both parties confirmed
        const updated = await db.query(
            'SELECT * FROM rental_requests WHERE id = $1',
            [requestId]
        );
        
        if (updated.rows[0].pickup_confirmed_by_lister && updated.rows[0].pickup_confirmed_by_renter) {
            await db.query(
                `UPDATE rental_requests 
                 SET delivery_status = 'delivered', delivery_delivered_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [requestId]
            );
        }
        
        res.json({ message: 'Pickup confirmed successfully' });
    } catch (error) {
        console.error('Error confirming pickup:', error);
        res.status(500).json({ error: 'Failed to confirm pickup' });
    }
});

// Confirm pickup by lister
router.post('/confirm-pickup-lister', isLoggedIn, async (req, res) => {
    try {
        const { requestId } = req.body;
        
        const request = await db.query(
            `SELECT rr.* FROM rental_requests rr
             JOIN listings r ON rr.listing_id = r.id
             WHERE rr.id = $1 AND r.user_id = $2`,
            [requestId, req.user.id]
        );
        
        if (request.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        await db.query(
            'UPDATE rental_requests SET pickup_confirmed_by_lister = TRUE WHERE id = $1',
            [requestId]
        );
        
        // Check if both parties confirmed
        const updated = await db.query(
            'SELECT * FROM rental_requests WHERE id = $1',
            [requestId]
        );
        
        if (updated.rows[0].pickup_confirmed_by_lister && updated.rows[0].pickup_confirmed_by_renter) {
            await db.query(
                `UPDATE rental_requests 
                 SET delivery_status = 'delivered', delivery_delivered_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [requestId]
            );
        }
        
        res.json({ message: 'Pickup confirmed successfully' });
    } catch (error) {
        console.error('Error confirming pickup:', error);
        res.status(500).json({ error: 'Failed to confirm pickup' });
    }
});

// Submit rating
router.post('/submit-rating', isLoggedIn, async (req, res) => {
    try {
        const { requestId, rentalRating, listerRating, rentalReview, listerReview } = req.body;
        
        // Verify request belongs to user and delivery is complete
        const request = await db.query(
            `SELECT rr.*, r.user_id as lister_id 
             FROM rental_requests rr
             JOIN listings r ON rr.listing_id = r.id
             WHERE rr.id = $1 AND rr.renter_user_id = $2 AND rr.delivery_status = 'delivered'`,
            [requestId, req.user.id]
        );
        
        if (request.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found or delivery not complete' });
        }
        
        const { rental_id, lister_id } = request.rows[0];
        
        // Check if rating already exists
        const existing = await db.query(
            'SELECT id FROM ratings WHERE rental_request_id = $1',
            [requestId]
        );
        
        if (existing.rows.length > 0) {
            // Update existing rating
            await db.query(
                `UPDATE ratings 
                 SET rental_rating = $1, lister_rating = $2, rental_review = $3, lister_review = $4
                 WHERE rental_request_id = $5`,
                [rentalRating, listerRating, rentalReview, listerReview, requestId]
            );
        } else {
            // Insert new rating
            await db.query(
                `INSERT INTO ratings (rental_request_id, rental_id, renter_id, lister_id, 
                                     rental_rating, lister_rating, rental_review, lister_review)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [requestId, rental_id, req.user.id, lister_id, rentalRating, listerRating, rentalReview, listerReview]
            );
        }
        
        res.json({ message: 'Rating submitted successfully' });
    } catch (error) {
        console.error('Error submitting rating:', error);
        res.status(500).json({ error: 'Failed to submit rating' });
    }
});

// Get ratings for a rental
router.get('/ratings/:rentalId', async (req, res) => {
    try {
        const { rentalId } = req.params;
        
        const ratings = await db.query(
            `SELECT r.*, u.name as renter_name, u.profile_picture as renter_picture
             FROM ratings r
             JOIN users u ON r.renter_id = u.id
             WHERE r.rental_id = $1
             ORDER BY r.created_at DESC`,
            [rentalId]
        );
        
        res.json(ratings.rows);
    } catch (error) {
        console.error('Error fetching ratings:', error);
        res.status(500).json({ error: 'Failed to fetch ratings' });
    }
});

// Initiate return process
router.post('/initiate-return', isLoggedIn, async (req, res) => {
    try {
        const { requestId, returnOption, returnAddress, returnDeliveryCost } = req.body;
        
        const request = await db.query(
            'SELECT * FROM rental_requests WHERE id = $1 AND renter_user_id = $2',
            [requestId, req.user.id]
        );
        
        if (request.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        // Check if rental period is over
        const endDate = new Date(request.rows[0].end_date);
        if (endDate > new Date()) {
            return res.status(400).json({ error: 'Rental period is not over yet' });
        }
        
        await db.query(
            `UPDATE rental_requests 
             SET return_initiated = TRUE, return_option = $1, return_delivery_address = $2, return_delivery_cost = $3
             WHERE id = $4`,
            [returnOption, returnAddress, returnDeliveryCost || 0, requestId]
        );
        
        res.json({ 
            message: 'Return initiated successfully',
            requiresPayment: returnOption === 'delivery' && returnDeliveryCost > 0
        });
    } catch (error) {
        console.error('Error initiating return:', error);
        res.status(500).json({ error: 'Failed to initiate return' });
    }
});

// Process return delivery payment
router.post('/pay-return-delivery', isLoggedIn, async (req, res) => {
    try {
        const { requestId } = req.body;
        
        const request = await db.query(
            'SELECT * FROM rental_requests WHERE id = $1 AND renter_user_id = $2',
            [requestId, req.user.id]
        );
        
        if (request.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        await db.query(
            `UPDATE rental_requests 
             SET return_delivery_paid = TRUE, return_delivery_status = 'shipped', return_shipped_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [requestId]
        );
        
        // Create return delivery event
        await db.query(
            `INSERT INTO delivery_events (rental_request_id, event_type, description, event_time)
             VALUES ($1, 'return_shipped', 'Return pickup has been initiated', CURRENT_TIMESTAMP)`,
            [requestId]
        );
        
        // Simulate return delivery
        simulateReturnDelivery(requestId, request.rows[0].category);
        
        res.json({ message: 'Return delivery payment successful' });
    } catch (error) {
        console.error('Error processing return delivery payment:', error);
        res.status(500).json({ error: 'Failed to process return delivery payment' });
    }
});

// Simulate return delivery progression
async function simulateReturnDelivery(requestId, category) {
    try {
        // Get rental request details including distance
        const request = await db.query(
            `SELECT rr.*, r.category 
             FROM rental_requests rr
             JOIN listings r ON r.id = rr.listing_id
             WHERE rr.id = $1`,
            [requestId]
        );
        
        if (request.rows.length === 0) {
            console.error('Request not found for return delivery simulation');
            return;
        }
        
        const returnDistance = parseFloat(request.rows[0].return_delivery_cost) || parseFloat(request.rows[0].delivery_cost) || 10;
        const categoryName = request.rows[0].category || '';
        
        // Calculate base time from distance (same formula as forward delivery)
        // Formula: 3 hours base + (distance * 20 minutes per km)
        let baseMinutes = 180 + (returnDistance * 20);
        
        // Add multiplier for heavy/sensitive items
        const heavyItems = ['tv', 'drone', 'speaker', 'camera', 'laptop', 'gaming'];
        const isHeavyOrSensitive = heavyItems.some(item => categoryName.toLowerCase().includes(item));
        
        if (isHeavyOrSensitive) {
            baseMinutes *= (1.1 + Math.random() * 0.2);
        }
        
        // Add small random variation
        const totalMinutes = baseMinutes * (0.9 + Math.random() * 0.2);
        
        // Enforce limits: 3-12 hours
        const finalMinutes = Math.max(180, Math.min(720, totalMinutes));
        
        console.log(`🔙 Return delivery simulation for request ${requestId}:`);
        console.log(`   Distance proxy: ${returnDistance}km`);
        console.log(`   Category: ${categoryName}`);
        console.log(`   Heavy/Sensitive: ${isHeavyOrSensitive}`);
        console.log(`   Total return time: ${Math.round(finalMinutes)} minutes (${(finalMinutes / 60).toFixed(1)} hours)`);
        
        const enRouteDelay = finalMinutes * (0.4 + Math.random() * 0.2);
        setTimeout(async () => {
            await db.query(
                `UPDATE rental_requests 
                 SET return_delivery_status = 'en_route', return_en_route_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [requestId]
            );
            
            await db.query(
                `INSERT INTO delivery_events (rental_request_id, event_type, description, event_time)
                 VALUES ($1, 'return_en_route', 'Return is on the way back to the lister', CURRENT_TIMESTAMP)`,
                [requestId]
            );
        }, enRouteDelay * 60 * 1000);
        
        setTimeout(async () => {
            await db.query(
                `UPDATE rental_requests 
                 SET return_delivery_status = 'delivered', return_delivered_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [requestId]
            );
            
            await db.query(
                `INSERT INTO delivery_events (rental_request_id, event_type, description, event_time)
                 VALUES ($1, 'return_delivered', 'Return has been delivered back to the lister', CURRENT_TIMESTAMP)`,
                [requestId]
            );
        }, finalMinutes * 60 * 1000);
        
    } catch (error) {
        console.error('Error simulating return delivery:', error);
    }
}

// Confirm return by renter
router.post('/confirm-return-renter', isLoggedIn, async (req, res) => {
    try {
        const { requestId } = req.body;
        
        await db.query(
            'UPDATE rental_requests SET return_confirmed_by_renter = TRUE WHERE id = $1',
            [requestId]
        );
        
        res.json({ message: 'Return confirmed by renter' });
    } catch (error) {
        console.error('Error confirming return:', error);
        res.status(500).json({ error: 'Failed to confirm return' });
    }
});

// Confirm return by lister and reactivate rental
router.post('/confirm-return-lister', isLoggedIn, async (req, res) => {
    try {
        const { requestId } = req.body;
        
        const request = await db.query(
            `SELECT rr.*, r.id as rental_id FROM rental_requests rr
             JOIN listings r ON rr.listing_id = r.id
             WHERE rr.id = $1 AND r.user_id = $2`,
            [requestId, req.user.id]
        );
        
        if (request.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        await db.query(
            'UPDATE rental_requests SET return_confirmed_by_lister = TRUE WHERE id = $1',
            [requestId]
        );
        
        // Check if both parties confirmed return
        const updated = await db.query(
            'SELECT * FROM rental_requests WHERE id = $1',
            [requestId]
        );
        
        if (updated.rows[0].return_confirmed_by_lister && updated.rows[0].return_confirmed_by_renter) {
            // Reactivate the rental
            await db.query(
                'UPDATE listings SET is_available = TRUE, rental_status = \'available\' WHERE id = $1',
                [request.rows[0].rental_id]
            );
            
            // Mark request as completed
            await db.query(
                'UPDATE rental_requests SET status = \'completed\' WHERE id = $1',
                [requestId]
            );
        }
        
        res.json({ message: 'Return confirmed and rental reactivated' });
    } catch (error) {
        console.error('Error confirming return:', error);
        res.status(500).json({ error: 'Failed to confirm return' });
    }
});

// Get delivery ratings for a listing
router.get('/listings/:listingId/delivery-ratings', async (req, res) => {
    try {
        const { listingId } = req.params;
        
        // Get all delivery ratings for this listing
        const ratingsResult = await db.query(`
            SELECT 
                dr.id,
                dr.delivery_rating,
                dr.item_condition_rating,
                dr.communication_rating,
                dr.comment,
                dr.rater_type,
                dr.created_at,
                u.name as rater_name,
                u.profile_picture as rater_picture,
                (dr.delivery_rating + dr.item_condition_rating + dr.communication_rating) / 3.0 as avg_rating
            FROM delivery_ratings dr
            JOIN rental_requests rr ON rr.id = dr.request_id
            JOIN users u ON u.id = dr.rater_id
            WHERE rr.listing_id = $1
            ORDER BY dr.created_at DESC
        `, [listingId]);
        
        // Calculate average ratings
        let avgDeliveryRating = 0;
        let avgItemConditionRating = 0;
        let avgCommunicationRating = 0;
        let overallAvgRating = 0;
        let totalRatings = ratingsResult.rows.length;
        
        if (totalRatings > 0) {
            const sums = ratingsResult.rows.reduce((acc, rating) => {
                acc.delivery += rating.delivery_rating;
                acc.item_condition += rating.item_condition_rating;
                acc.communication += rating.communication_rating;
                return acc;
            }, { delivery: 0, item_condition: 0, communication: 0 });
            
            avgDeliveryRating = sums.delivery / totalRatings;
            avgItemConditionRating = sums.item_condition / totalRatings;
            avgCommunicationRating = sums.communication / totalRatings;
            overallAvgRating = (avgDeliveryRating + avgItemConditionRating + avgCommunicationRating) / 3;
        }
        
        res.json({
            success: true,
            ratings: ratingsResult.rows,
            summary: {
                totalRatings,
                avgDeliveryRating: avgDeliveryRating.toFixed(2),
                avgItemConditionRating: avgItemConditionRating.toFixed(2),
                avgCommunicationRating: avgCommunicationRating.toFixed(2),
                overallAvgRating: overallAvgRating.toFixed(2)
            }
        });
        
    } catch (error) {
        console.error('Error fetching delivery ratings:', error);
        res.status(500).json({ error: 'Failed to fetch delivery ratings' });
    }
});

// RATING DELIVERY SYSTEM
router.post('/rental-requests/:requestId/rate', isLoggedIn, async (req, res) => {
    try {
        const { requestId } = req.params;
        const { delivery_rating, item_condition_rating, communication_rating, comment, rater_type } = req.body;
        
        // Validate ratings
        if (!delivery_rating || !item_condition_rating || !communication_rating) {
            return res.status(400).json({ error: 'All ratings are required' });
        }
        
        if (![1, 2, 3, 4, 5].includes(delivery_rating) || 
            ![1, 2, 3, 4, 5].includes(item_condition_rating) || 
            ![1, 2, 3, 4, 5].includes(communication_rating)) {
            return res.status(400).json({ error: 'Ratings must be between 1 and 5' });
        }
        
        // Check if request exists and user has permission
        const requestCheck = await db.query(`
            SELECT rr.id, rr.renter_user_id, rr.delivery_status, r.user_id as lister_id
            FROM rental_requests rr
            JOIN rentals r ON r.id = rr.listing_id
            WHERE rr.id = $1
        `, [requestId]);
        
        if (requestCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Rental request not found' });
        }
        
        const request = requestCheck.rows[0];
        
        // Check if user has permission to rate
        if (rater_type === 'lister' && request.lister_id !== req.user.id) {
            return res.status(403).json({ error: 'Only the lister can rate from lister perspective' });
        }
        
        if (rater_type === 'renter' && request.renter_user_id !== req.user.id) {
            return res.status(403).json({ error: 'Only the renter can rate from renter perspective' });
        }
        
        // Check if delivery is completed
        if (request.delivery_status !== 'delivered') {
            return res.status(400).json({ error: 'Can only rate completed deliveries' });
        }
        
        // Insert or update rating
        const ratingResult = await db.query(`
            INSERT INTO delivery_ratings 
            (request_id, rater_id, rater_type, delivery_rating, item_condition_rating, communication_rating, comment)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (request_id, rater_type) 
            DO UPDATE SET 
                delivery_rating = EXCLUDED.delivery_rating,
                item_condition_rating = EXCLUDED.item_condition_rating,
                communication_rating = EXCLUDED.communication_rating,
                comment = EXCLUDED.comment,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
        `, [requestId, req.user.id, rater_type, delivery_rating, item_condition_rating, communication_rating, comment]);
        
        // Update request to mark as rated
        if (rater_type === 'lister') {
            await db.query(`
                UPDATE rental_requests 
                SET delivery_rated = TRUE
                WHERE id = $1
            `, [requestId]);
        }
        
        res.json({ 
            success: true, 
            message: 'Rating submitted successfully',
            ratingId: ratingResult.rows[0].id
        });
        
    } catch (error) {
        console.error('Error submitting rating:', error);
        res.status(500).json({ error: 'Failed to submit rating' });
    }
});

// AUTOMATIC DELIVERY SIMULATION SYSTEM
// Auto-update delivery status based on realistic timing
router.get('/simulate-delivery-progress', isLoggedIn, async (req, res) => {
    try {
        console.log('🚚 Running automatic delivery simulation...');
        
        // Get all active deliveries that need status updates
        const activeDeliveries = await db.query(`
            SELECT rr.id, rr.listing_id, rr.renter_user_id,
                   rr.delivery_status, rr.delivery_shipped_at,
                   rr.delivery_cost, rr.distance_km,
                   rr.expected_en_route_at, rr.expected_delivered_at,
                   r.title as listing_title
            FROM rental_requests rr
            JOIN rentals r ON r.id = rr.listing_id
            WHERE rr.delivery_paid = TRUE 
            AND rr.delivery_status IN ('shipped', 'en_route')
            AND rr.delivery_shipped_at IS NOT NULL
            AND rr.expected_en_route_at IS NOT NULL
            AND rr.expected_delivered_at IS NOT NULL
        `);

        const updates = [];
        const now = new Date();

        for (const delivery of activeDeliveries.rows) {
            const expectedEnRoute = new Date(delivery.expected_en_route_at);
            const expectedDelivered = new Date(delivery.expected_delivered_at);
            
            console.log(`📦 Checking delivery ${delivery.id} (${delivery.listing_title}):`);
            console.log(`   Current status: ${delivery.delivery_status}`);
            console.log(`   Expected en route at: ${expectedEnRoute.toISOString()}`);
            console.log(`   Expected delivered at: ${expectedDelivered.toISOString()}`);
            console.log(`   Current time: ${now.toISOString()}`);
            
            // Update to "en_route" if it's time
            if (delivery.delivery_status === 'shipped' && now >= expectedEnRoute) {
                await db.query(`
                    UPDATE rental_requests 
                    SET delivery_status = 'en_route', delivery_en_route_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [delivery.id]);
                
                updates.push({
                    id: delivery.id,
                    title: delivery.listing_title,
                    status: 'en_route',
                    message: `${delivery.listing_title} is now en route for delivery`
                });
                console.log(`✅ Updated delivery ${delivery.id} to EN_ROUTE`);
            }
            
            // Update to "delivered" if it's time
            if ((delivery.delivery_status === 'shipped' || delivery.delivery_status === 'en_route') && 
                now >= expectedDelivered) {
                
                await db.query(`
                    UPDATE rental_requests 
                    SET delivery_status = 'delivered', delivery_delivered_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [delivery.id]);
                
                updates.push({
                    id: delivery.id,
                    title: delivery.listing_title,
                    status: 'delivered',
                    message: `${delivery.listing_title} has been successfully delivered`
                });
                console.log(`🎉 Updated delivery ${delivery.id} to DELIVERED`);
            }
        }
        
        res.json({ 
            message: 'Delivery simulation completed',
            updatesProcessed: updates.length,
            updates: updates,
            totalActiveDeliveries: activeDeliveries.rows.length
        });
        
    } catch (error) {
        console.error('Error in delivery simulation:', error);
        res.status(500).json({ error: 'Failed to simulate delivery progress' });
    }
});

// Get delivery status for a specific request
router.get('/delivery-status/:requestId', isLoggedIn, async (req, res) => {
    try {
        const { requestId } = req.params;
        
        const result = await db.query(`
            SELECT rr.id, rr.delivery_status, rr.delivery_shipped_at,
                   rr.delivery_en_route_at, rr.delivery_delivered_at,
                   rr.distance_km, r.title as listing_title
            FROM rental_requests rr
            JOIN rentals r ON r.id = rr.listing_id
            WHERE rr.id = $1 AND (rr.renter_user_id = $2 OR r.user_id = $2)
        `, [requestId, req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery not found' });
        }
        
        const delivery = result.rows[0];
        
        // Calculate estimated times
        let estimatedDelivery = null;
        if (delivery.delivery_shipped_at) {
            const distance = delivery.distance_km || 10;
            const totalMinutes = Math.max(180, distance * 15 + Math.random() * 60);
            estimatedDelivery = new Date(new Date(delivery.delivery_shipped_at).getTime() + totalMinutes * 60000);
        }
        
        res.json({
            ...delivery,
            estimatedDelivery
        });
        
    } catch (error) {
        console.error('Error getting delivery status:', error);
        res.status(500).json({ error: 'Failed to get delivery status' });
    }
});

// OWNER RATING SYSTEM
// Rate an owner/lister after completing a rental
router.post('/rental-requests/:requestId/rate-owner', isLoggedIn, async (req, res) => {
    try {
        const { requestId } = req.params;
        const { rating, review } = req.body;
        const currentUserId = req.user.id;
        const currentUserType = req.user.google_id ? 'google' : 'phone';
        
        console.log('📝 Owner rating request:', { requestId, rating, currentUserId, currentUserType });
        
        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ 
                success: false,
                error: 'Rating must be between 1 and 5' 
            });
        }
        
        // Get rental request details
        const requestResult = await db.query(`
            SELECT 
                rr.*,
                l.user_id as owner_id,
                l.user_type as owner_type,
                l.title as listing_title
            FROM rental_requests rr
            JOIN listings l ON l.id = rr.listing_id
            WHERE rr.id = $1
        `, [requestId]);
        
        if (requestResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Rental request not found' 
            });
        }
        
        const request = requestResult.rows[0];
        
        // Verify the current user is the renter
        if (request.renter_id !== currentUserId || request.renter_type !== currentUserType) {
            return res.status(403).json({ 
                success: false,
                error: 'Only the renter can rate the owner' 
            });
        }
        
        // Check if delivery is completed
        if (request.delivery_status !== 'delivered') {
            return res.status(400).json({ 
                success: false,
                error: 'Can only rate owner after delivery is completed' 
            });
        }
        
        // Check if owner already rated for this request
        const existingRatingResult = await db.query(`
            SELECT id FROM user_ratings
            WHERE rated_user_id = $1 
            AND rated_user_type = $2
            AND rater_user_id = $3
            AND rater_user_type = $4
            AND listing_id = $5
        `, [request.owner_id, request.owner_type, currentUserId, currentUserType, request.listing_id]);
        
        if (existingRatingResult.rows.length > 0) {
            return res.status(400).json({ 
                success: false,
                error: 'You have already rated this owner for this rental' 
            });
        }
        
        // Insert owner rating
        const insertResult = await db.query(`
            INSERT INTO user_ratings (
                rated_user_id,
                rated_user_type,
                rater_user_id,
                rater_user_type,
                rating,
                review,
                listing_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [
            request.owner_id,
            request.owner_type,
            currentUserId,
            currentUserType,
            rating,
            review || null,
            request.listing_id
        ]);
        
        // Mark owner as rated in rental_requests (we'll add this column)
        await db.query(`
            UPDATE rental_requests 
            SET owner_rated = true
            WHERE id = $1
        `, [requestId]);
        
        console.log('✅ Owner rating submitted successfully:', insertResult.rows[0].id);
        
        res.json({
            success: true,
            message: 'Owner rated successfully',
            rating: insertResult.rows[0]
        });
        
    } catch (error) {
        console.error('Error rating owner:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to submit owner rating' 
        });
    }
});

// Get owner ratings for a specific request (to check if already rated)
router.get('/rental-requests/:requestId/owner-rating-status', isLoggedIn, async (req, res) => {
    try {
        const { requestId } = req.params;
        const currentUserId = req.user.id;
        const currentUserType = req.user.google_id ? 'google' : 'phone';
        
        const requestResult = await db.query(`
            SELECT 
                rr.owner_rated,
                l.user_id as owner_id,
                l.user_type as owner_type
            FROM rental_requests rr
            JOIN listings l ON l.id = rr.listing_id
            WHERE rr.id = $1
            AND rr.renter_id = $2
            AND rr.renter_type = $3
        `, [requestId, currentUserId, currentUserType]);
        
        if (requestResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Rental request not found' 
            });
        }
        
        const request = requestResult.rows[0];
        
        res.json({
            success: true,
            ownerRated: request.owner_rated || false
        });
        
    } catch (error) {
        console.error('Error checking owner rating status:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to check rating status' 
        });
    }
});

module.exports = router;



