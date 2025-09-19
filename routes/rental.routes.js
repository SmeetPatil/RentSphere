const express = require('express');
const { isLoggedIn } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Load categories from JSON file
const categoriesPath = path.join(__dirname, '../categories.json');
let categories = {};
try {
    categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
} catch (error) {
    console.error('Error loading categories:', error);
}

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
}

// Helper function to process categories and extract allowed ones
function processCategories(categories) {
    const allowedCategories = [];
    
    Object.entries(categories).forEach(([key, value]) => {
        if (typeof value === 'string' && value === 'allowed') {
            allowedCategories.push({
                name: key,
                displayName: key.charAt(0).toUpperCase() + key.slice(1),
                subcategories: null
            });
        } else if (typeof value === 'object' && value !== null) {
            const subcategories = [];
            Object.entries(value).forEach(([subKey, subValue]) => {
                if (typeof subValue === 'string' && subValue === 'allowed') {
                    subcategories.push({
                        name: subKey,
                        displayName: subKey.charAt(0).toUpperCase() + subKey.slice(1)
                    });
                } else if (typeof subValue === 'object' && subValue !== null) {
                    // Handle nested subcategories (like gaming consoles)
                    Object.entries(subValue).forEach(([nestedKey, nestedValue]) => {
                        if (typeof nestedValue === 'string' && nestedValue === 'allowed') {
                            subcategories.push({
                                name: `${subKey}_${nestedKey}`,
                                displayName: `${subKey.charAt(0).toUpperCase() + subKey.slice(1)} ${nestedKey.toUpperCase()}`
                            });
                        }
                    });
                }
            });
            
            if (subcategories.length > 0) {
                allowedCategories.push({
                    name: key,
                    displayName: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
                    subcategories: subcategories
                });
            }
        }
    });
    
    return allowedCategories;
}

// Get all allowed categories
router.get('/api/categories', (req, res) => {
    try {
        const allowedCategories = processCategories(categories);
        res.json({ success: true, categories: allowedCategories });
    } catch (error) {
        console.error('Error processing categories:', error);
        res.status(500).json({ success: false, message: 'Failed to load categories' });
    }
});

// Get rentals with geolocation filtering
router.get('/api/rentals', isLoggedIn, async (req, res) => {
    try {
        const pool = require('../database');
        const { category, subcategory, lat, lng, page = 1, limit = 20 } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({ 
                success: false, 
                message: 'User location (lat, lng) is required' 
            });
        }
        
        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        const offset = (page - 1) * limit;
        
        // Build query based on filters
        let query = `
            SELECT 
                l.*,
                CASE
                    WHEN l.user_type = 'google' THEN u.name
                    WHEN l.user_type = 'phone' THEN pu.name
                END as owner_name,
                CASE
                    WHEN l.user_type = 'google' THEN u.profile_picture
                    WHEN l.user_type = 'phone' THEN pu.profile_picture
                END as owner_profile_picture,
                CASE
                    WHEN l.user_type = 'google' THEN u.email
                    WHEN l.user_type = 'phone' THEN pu.phone
                END as owner_contact,
                COALESCE(AVG(ur.rating), 0) as owner_rating,
                COUNT(ur.rating) as rating_count
            FROM listings l
            LEFT JOIN users u ON l.user_id = u.id AND l.user_type = 'google'
            LEFT JOIN phone_users pu ON l.user_id = pu.id AND l.user_type = 'phone'
            LEFT JOIN user_ratings ur ON l.user_id = ur.rated_user_id AND l.user_type = ur.rated_user_type
            WHERE l.is_available = true
        `;
        
        const queryParams = [];
        let paramCount = 1;
        
        if (category) {
            query += ` AND l.category = $${paramCount}`;
            queryParams.push(category);
            paramCount++;
        }
        
        if (subcategory) {
            query += ` AND l.subcategory = $${paramCount}`;
            queryParams.push(subcategory);
            paramCount++;
        }
        
        query += `
            GROUP BY l.id, u.name, u.profile_picture, u.email, pu.name, pu.profile_picture, pu.phone
            ORDER BY l.created_at DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;
        
        queryParams.push(limit, offset);
        
        const result = await pool.query(query, queryParams);
        
        // Filter by distance (15km radius)
        const filteredListings = result.rows.filter(listing => {
            const distance = calculateDistance(userLat, userLng, listing.latitude, listing.longitude);
            return distance <= 15;
        });
        
        // Add distance to each listing
        const listingsWithDistance = filteredListings.map(listing => ({
            ...listing,
            distance: calculateDistance(userLat, userLng, listing.latitude, listing.longitude)
        }));
        
        res.json({ 
            success: true, 
            listings: listingsWithDistance,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: listingsWithDistance.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching rentals:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch rentals' });
    }
});

// Create a new listing
router.post('/api/listings', isLoggedIn, async (req, res) => {
    try {
        const pool = require('../database');
        const {
            category,
            subcategory,
            title,
            description,
            pricePerDay,
            images,
            specifications,
            address,
            latitude,
            longitude
        } = req.body;
        
        const userId = req.user.id;
        // Determine user type based on the presence of google_id field
        const userType = req.user.google_id ? 'google' : 'phone';
        
        console.log('Create listing API - User ID:', userId, 'User Type:', userType, 'User Object:', req.user);
        
        // Validate required fields
        if (!category || !title || !description || !pricePerDay || !address || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }
        
        // Validate category against allowed categories
        const allowedCategories = processCategories(categories);
        const validCategory = allowedCategories.find(cat => cat.name === category);
        if (!validCategory) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category selected'
            });
        }
        
        // Validate subcategory if provided
        if (subcategory && validCategory.subcategories) {
            const validSubcategory = validCategory.subcategories.find(sub => sub.name === subcategory);
            if (!validSubcategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid subcategory selected'
                });
            }
        }
        
        // Insert listing
        const insertQuery = `
            INSERT INTO listings (
                user_id, user_type, category, subcategory, title, description,
                price_per_day, images, specifications, latitude, longitude, address
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        
        const result = await pool.query(insertQuery, [
            userId,
            userType,
            category,
            subcategory || null,
            title,
            description,
            parseFloat(pricePerDay),
            images || [],
            specifications ? JSON.stringify(specifications) : null,
            parseFloat(latitude),
            parseFloat(longitude),
            address
        ]);
        
        res.json({
            success: true,
            message: 'Listing created successfully!',
            listing: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating listing:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create listing'
        });
    }
});

// Get user's own listings
router.get('/api/my-listings', isLoggedIn, async (req, res) => {
    try {
        const pool = require('../database');
        const userId = req.user.id;
        // Determine user type based on the presence of google_id field
        const userType = req.user.google_id ? 'google' : 'phone';
        
        console.log('My-listings API - User ID:', userId, 'User Type:', userType, 'User Object:', req.user);
        
        const query = `
            SELECT 
                l.*,
                COUNT(ur.rating) as rating_count,
                COALESCE(AVG(ur.rating), 0) as average_rating
            FROM listings l
            LEFT JOIN user_ratings ur ON l.user_id = ur.rated_user_id AND l.user_type = ur.rated_user_type
            WHERE l.user_id = $1 AND l.user_type = $2
            GROUP BY l.id
            ORDER BY l.created_at DESC
        `;
        
        const result = await pool.query(query, [userId, userType]);
        
        res.json({
            success: true,
            listings: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching user listings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch your listings'
        });
    }
});

// Update listing availability
router.patch('/api/listings/:id/availability', isLoggedIn, async (req, res) => {
    try {
        const pool = require('../database');
        const { id } = req.params;
        const { isAvailable } = req.body;
        const userId = req.user.id;
        const userType = req.user.google_id ? 'google' : 'phone';
        
        const updateQuery = `
            UPDATE listings 
            SET is_available = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND user_id = $3 AND user_type = $4
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [isAvailable, id, userId, userType]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found or you do not have permission to update it'
            });
        }
        
        res.json({
            success: true,
            message: `Listing ${isAvailable ? 'activated' : 'deactivated'} successfully`,
            listing: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating listing availability:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update listing availability'
        });
    }
});

// Get detailed rental information
router.get('/api/rentals/:id', isLoggedIn, async (req, res) => {
    try {
        const pool = require('../database');
        const { id } = req.params;
        const { lat, lng } = req.query;
        
        console.log('Rental details API - ID:', id, 'User Location:', lat, lng);
        
        if (!lat || !lng) {
            console.log('Missing location parameters');
            return res.status(400).json({ 
                success: false, 
                message: 'User location (lat, lng) is required' 
            });
        }
        
        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        
        console.log('Parsed coordinates:', userLat, userLng);
        
        // Get listing details with owner info
        const listingQuery = `
            SELECT 
                l.*,
                CASE
                    WHEN l.user_type = 'google' THEN u.name
                    WHEN l.user_type = 'phone' THEN pu.name
                END as owner_name,
                CASE
                    WHEN l.user_type = 'google' THEN u.profile_picture
                    WHEN l.user_type = 'phone' THEN pu.profile_picture
                END as owner_profile_picture,
                CASE
                    WHEN l.user_type = 'google' THEN u.email
                    WHEN l.user_type = 'phone' THEN pu.phone
                END as owner_contact,
                CASE
                    WHEN l.user_type = 'google' THEN u.created_at
                    WHEN l.user_type = 'phone' THEN pu.created_at
                END as owner_member_since
            FROM listings l
            LEFT JOIN users u ON l.user_id = u.id AND l.user_type = 'google'
            LEFT JOIN phone_users pu ON l.user_id = pu.id AND l.user_type = 'phone'
            WHERE l.id = $1 AND l.is_available = true
        `;
        
        const listingResult = await pool.query(listingQuery, [id]);
        
        console.log('Listing query result:', listingResult.rows.length);
        
        if (listingResult.rows.length === 0) {
            console.log('Listing not found in database');
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }
        
        const listing = listingResult.rows[0];
        console.log('Found listing:', listing.title, 'at', listing.latitude, listing.longitude);
        
        // Check if listing is within 15km
        const distance = calculateDistance(userLat, userLng, parseFloat(listing.latitude), parseFloat(listing.longitude));
        console.log('Distance calculation:');
        console.log('  User location:', userLat, userLng);
        console.log('  Listing location:', parseFloat(listing.latitude), parseFloat(listing.longitude));
        console.log('  Calculated distance:', distance, 'km');
        
        // Temporarily increase radius to 50km for debugging
        if (distance > 50) {
            console.log('Listing outside 50km radius (debug mode)');
            return res.status(403).json({ 
                success: false, 
                message: `This listing is ${distance.toFixed(1)}km away, outside your area (50km radius - debug mode)` 
            });
        }
        
        console.log('Distance check passed, proceeding with listing details');
        
        // Get owner ratings
        const ratingsQuery = `
            SELECT 
                ur.rating,
                ur.review,
                ur.created_at,
                CASE
                    WHEN ur.rater_user_type = 'google' THEN u.name
                    WHEN ur.rater_user_type = 'phone' THEN pu.name
                END as reviewer_name
            FROM user_ratings ur
            LEFT JOIN users u ON ur.rater_user_id = u.id AND ur.rater_user_type = 'google'
            LEFT JOIN phone_users pu ON ur.rater_user_id = pu.id AND ur.rater_user_type = 'phone'
            WHERE ur.rated_user_id = $1 AND ur.rated_user_type = $2
            ORDER BY ur.created_at DESC
            LIMIT 10
        `;
        
        const ratingsResult = await pool.query(ratingsQuery, [listing.user_id, listing.user_type]);
        
        // Calculate average rating
        const avgRatingQuery = `
            SELECT 
                COALESCE(AVG(rating), 0) as average_rating,
                COUNT(rating) as total_ratings
            FROM user_ratings
            WHERE rated_user_id = $1 AND rated_user_type = $2
        `;
        
        const avgRatingResult = await pool.query(avgRatingQuery, [listing.user_id, listing.user_type]);
        
        res.json({
            success: true,
            listing: {
                ...listing,
                distance: distance
            },
            owner_rating: {
                average: parseFloat(avgRatingResult.rows[0].average_rating),
                total: parseInt(avgRatingResult.rows[0].total_ratings),
                reviews: ratingsResult.rows
            }
        });
        
    } catch (error) {
        console.error('Error fetching rental details:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch rental details',
            error: error.message 
        });
    }
});

// Delete a listing (and its images)
router.delete('/api/listings/:id', isLoggedIn, async (req, res) => {
    try {
        const pool = require('../database');
        const { id } = req.params;
        const userId = req.user.id;
        const userType = req.user.google_id ? 'google' : 'phone';
        const userName = req.user.name.replace(/[^a-zA-Z0-9]/g, '_');

        // First, get the listing to verify ownership
        const listingQuery = `
            SELECT * FROM listings 
            WHERE id = $1 AND user_id = $2 AND user_type = $3
        `;
        
        const listingResult = await pool.query(listingQuery, [id, userId, userType]);
        
        if (listingResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found or you do not have permission to delete it'
            });
        }

        // Delete images from file system
        try {
            const simpleImageService = require('../services/simpleImageService');
            await simpleImageService.deleteListingImages(userName, userId, id);
            console.log(`🗑️ Deleted images for listing ${id}`);
        } catch (imageError) {
            console.error('Error deleting images:', imageError);
            // Continue with listing deletion even if image deletion fails
        }

        // Delete the listing from database
        const deleteQuery = `
            DELETE FROM listings 
            WHERE id = $1 AND user_id = $2 AND user_type = $3
            RETURNING *
        `;
        
        const result = await pool.query(deleteQuery, [id, userId, userType]);

        res.json({
            success: true,
            message: 'Listing and associated images deleted successfully',
            deletedListing: result.rows[0]
        });

    } catch (error) {
        console.error('Error deleting listing:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete listing',
            error: error.message
        });
    }
});

// Get a specific listing for editing
router.get('/api/listings/:id/edit', isLoggedIn, async (req, res) => {
    try {
        const pool = require('../database');
        const { id } = req.params;
        const userId = req.user.id;
        const userType = req.user.google_id ? 'google' : 'phone';

        const query = `
            SELECT * FROM listings 
            WHERE id = $1 AND user_id = $2 AND user_type = $3
        `;
        
        const result = await pool.query(query, [id, userId, userType]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found or you do not have permission to edit it'
            });
        }

        res.json({
            success: true,
            listing: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching listing for edit:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch listing details'
        });
    }
});

// Update a listing
router.put('/api/listings/:id', isLoggedIn, async (req, res) => {
    try {
        const pool = require('../database');
        const { id } = req.params;
        const {
            category,
            subcategory,
            title,
            description,
            pricePerDay,
            specifications,
            address,
            latitude,
            longitude
        } = req.body;
        
        const userId = req.user.id;
        const userType = req.user.google_id ? 'google' : 'phone';

        // Validate required fields
        if (!category || !title || !description || !pricePerDay || !address || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        // Validate category against allowed categories
        const fs = require('fs');
        const path = require('path');
        const categoriesPath = path.join(__dirname, '../categories.json');
        let categories = {};
        try {
            categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
        } catch (error) {
            console.error('Error loading categories:', error);
        }

        const allowedCategories = processCategories(categories);
        const validCategory = allowedCategories.find(cat => cat.name === category);
        if (!validCategory) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category selected'
            });
        }

        // Validate subcategory if provided
        if (subcategory && validCategory.subcategories) {
            const validSubcategory = validCategory.subcategories.find(sub => sub.name === subcategory);
            if (!validSubcategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid subcategory selected'
                });
            }
        }

        // Update listing
        const updateQuery = `
            UPDATE listings 
            SET category = $1, subcategory = $2, title = $3, description = $4,
                price_per_day = $5, specifications = $6, latitude = $7, longitude = $8, 
                address = $9, updated_at = CURRENT_TIMESTAMP
            WHERE id = $10 AND user_id = $11 AND user_type = $12
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [
            category,
            subcategory || null,
            title,
            description,
            parseFloat(pricePerDay),
            specifications ? JSON.stringify(specifications) : null,
            parseFloat(latitude),
            parseFloat(longitude),
            address,
            id,
            userId,
            userType
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found or you do not have permission to update it'
            });
        }

        res.json({
            success: true,
            message: 'Listing updated successfully!',
            listing: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating listing:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update listing'
        });
    }
});

module.exports = router;