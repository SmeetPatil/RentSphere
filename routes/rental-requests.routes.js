const express = require('express');
const { isLoggedIn } = require('../middleware/auth');
const pool = require('../database');
const router = express.Router();

// Create a new rental request
router.post('/api/rental-requests', isLoggedIn, async (req, res) => {
    try {
        const { listingId, startDate, endDate, message } = req.body;
        const renterUserId = req.user.id;
        const renterUserType = req.user.google_id ? 'google' : 'phone';

        // Validate input
        if (!listingId || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Listing ID, start date, and end date are required'
            });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (start < today) {
            return res.status(400).json({
                success: false,
                message: 'Start date cannot be in the past'
            });
        }

        if (end <= start) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        // Calculate total days and price
        const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        // Get listing details and check availability
        const listingQuery = `
            SELECT l.*, 
                   CASE 
                       WHEN l.user_type = 'google' THEN gu.name
                       WHEN l.user_type = 'phone' THEN pu.name
                   END as owner_name,
                   CASE 
                       WHEN l.user_type = 'google' THEN gu.email
                       WHEN l.user_type = 'phone' THEN pu.phone
                   END as owner_contact
            FROM listings l
            LEFT JOIN users gu ON (l.user_type = 'google' AND gu.id = l.user_id)
            LEFT JOIN phone_users pu ON (l.user_type = 'phone' AND pu.id = l.user_id)
            WHERE l.id = $1 AND l.is_available = true AND l.rental_status = 'available'
        `;

        const listingResult = await pool.query(listingQuery, [listingId]);

        if (listingResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found or not available for rent'
            });
        }

        const listing = listingResult.rows[0];

        // Check if user is trying to rent their own listing
        if (listing.user_id == renterUserId && listing.user_type === renterUserType) {
            return res.status(400).json({
                success: false,
                message: 'You cannot rent your own listing'
            });
        }

        const totalPrice = listing.price_per_day * totalDays;

        // Check for existing pending request
        const existingRequestQuery = `
            SELECT id FROM rental_requests 
            WHERE listing_id = $1 AND renter_user_id = $2 AND renter_user_type = $3 AND status = 'pending'
        `;

        const existingRequest = await pool.query(existingRequestQuery, [
            listingId, renterUserId, renterUserType
        ]);

        if (existingRequest.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending request for this listing'
            });
        }

        // Create rental request
        const insertQuery = `
            INSERT INTO rental_requests (
                listing_id, renter_user_id, renter_user_type, 
                start_date, end_date, total_days, total_price, message
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const result = await pool.query(insertQuery, [
            listingId, renterUserId, renterUserType,
            startDate, endDate, totalDays, totalPrice, message || ''
        ]);

        const rentalRequest = result.rows[0];

        res.json({
            success: true,
            message: 'Rental request submitted successfully',
            rentalRequest: {
                ...rentalRequest,
                listing_title: listing.title,
                listing_price_per_day: listing.price_per_day
            }
        });

    } catch (error) {
        console.error('Error creating rental request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create rental request',
            error: error.message
        });
    }
});

// Get rental requests for a listing (for listing owner)
router.get('/api/rental-requests/listing/:listingId', isLoggedIn, async (req, res) => {
    try {
        const { listingId } = req.params;
        const userId = req.user.id;
        const userType = req.user.google_id ? 'google' : 'phone';

        // Verify user owns the listing
        const listingQuery = `
            SELECT id FROM listings 
            WHERE id = $1 AND user_id = $2 AND user_type = $3
        `;

        const listingResult = await pool.query(listingQuery, [listingId, userId, userType]);

        if (listingResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You can only view requests for your own listings'
            });
        }

        // Get all requests for this listing with renter info
        const requestsQuery = `
            SELECT 
                rr.*,
                CASE 
                    WHEN rr.renter_user_type = 'google' THEN gu.name
                    WHEN rr.renter_user_type = 'phone' THEN pu.name
                END as renter_name,
                CASE 
                    WHEN rr.renter_user_type = 'google' THEN gu.email
                    WHEN rr.renter_user_type = 'phone' THEN pu.phone
                END as renter_contact,
                CASE 
                    WHEN rr.renter_user_type = 'google' THEN gu.profile_picture
                    ELSE NULL
                END as renter_profile_picture
            FROM rental_requests rr
            LEFT JOIN users gu ON (rr.renter_user_type = 'google' AND gu.id = rr.renter_user_id)
            LEFT JOIN phone_users pu ON (rr.renter_user_type = 'phone' AND pu.id = rr.renter_user_id)
            WHERE rr.listing_id = $1
            ORDER BY 
                CASE rr.status 
                    WHEN 'pending' THEN 1 
                    WHEN 'approved' THEN 2 
                    ELSE 3 
                END,
                rr.created_at DESC
        `;

        const result = await pool.query(requestsQuery, [listingId]);

        res.json({
            success: true,
            requests: result.rows
        });

    } catch (error) {
        console.error('Error fetching rental requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch rental requests',
            error: error.message
        });
    }
});

// Update rental request status (approve/deny)
router.patch('/api/rental-requests/:requestId', isLoggedIn, async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body;
        const userId = req.user.id;
        const userType = req.user.google_id ? 'google' : 'phone';

        if (!['approved', 'denied'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be either approved or denied'
            });
        }

        // Verify user owns the listing for this request
        const verifyQuery = `
            SELECT rr.*, l.title as listing_title
            FROM rental_requests rr
            JOIN listings l ON rr.listing_id = l.id
            WHERE rr.id = $1 AND l.user_id = $2 AND l.user_type = $3 AND rr.status = 'pending'
        `;

        const verifyResult = await pool.query(verifyQuery, [requestId, userId, userType]);

        if (verifyResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Request not found or you do not have permission to update it'
            });
        }

        // Update request status
        const updateQuery = `
            UPDATE rental_requests 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [status, requestId]);

        const updatedRequest = result.rows[0];

        res.json({
            success: true,
            message: `Rental request ${status} successfully`,
            request: {
                ...updatedRequest,
                listing_title: verifyResult.rows[0].listing_title
            }
        });

    } catch (error) {
        console.error('Error updating rental request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update rental request',
            error: error.message
        });
    }
});

// Get user's rental requests (as renter)
router.get('/api/my-rental-requests', isLoggedIn, async (req, res) => {
    try {
        const userId = req.user.id;
        const userType = req.user.google_id ? 'google' : 'phone';

        const requestsQuery = `
            SELECT 
                rr.*,
                l.title as listing_title,
                l.price_per_day as listing_price_per_day,
                l.images as listing_images,
                l.category as listing_category,
                CASE 
                    WHEN l.user_type = 'google' THEN gu.name
                    WHEN l.user_type = 'phone' THEN pu.name
                END as owner_name
            FROM rental_requests rr
            JOIN listings l ON rr.listing_id = l.id
            LEFT JOIN users gu ON (l.user_type = 'google' AND gu.id = l.user_id)
            LEFT JOIN phone_users pu ON (l.user_type = 'phone' AND pu.id = l.user_id)
            WHERE rr.renter_user_id = $1 AND rr.renter_user_type = $2
            ORDER BY rr.created_at DESC
        `;

        const result = await pool.query(requestsQuery, [userId, userType]);

        res.json({
            success: true,
            requests: result.rows
        });

    } catch (error) {
        console.error('Error fetching user rental requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch rental requests',
            error: error.message
        });
    }
});

module.exports = router;