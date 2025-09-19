const express = require('express');
const multer = require('multer');
const { isLoggedIn } = require('../middleware/auth');
const simpleImageService = require('../services/simpleImageService');
const router = express.Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Maximum 5 files
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG and PNG images are allowed'), false);
        }
    }
});

// Upload images for a listing
router.post('/api/upload-images/:listingId', isLoggedIn, upload.array('images', 5), async (req, res) => {
    try {
        const { listingId } = req.params;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No images provided'
            });
        }

        if (files.length > 5) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 5 images allowed per listing'
            });
        }

        // Get user information
        const userId = req.user.id;
        const userName = req.user.name.replace(/[^a-zA-Z0-9]/g, '_'); // Sanitize name for folder
        
        console.log(`📸 Uploading ${files.length} images for listing ${listingId} by user ${userName}(${userId})`);
        console.log('Files received:', files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })));

        // Upload images using simple file system storage
        const imageUrls = await simpleImageService.uploadListingImages(
            files,
            userName,
            userId,
            listingId
        );

        // Update listing with image URLs
        const pool = require('../database');
        const userType = req.user.google_id ? 'google' : 'phone';
        
        const updateQuery = `
            UPDATE listings 
            SET images = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND user_id = $3 AND user_type = $4
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [imageUrls, listingId, userId, userType]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found or you do not have permission to update it'
            });
        }

        res.json({
            success: true,
            message: `Successfully uploaded ${imageUrls.length} images`,
            images: imageUrls,
            listing: result.rows[0]
        });

    } catch (error) {
        console.error('Error uploading images:', error);
        
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum 5MB per image.'
            });
        }
        
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum 5 images allowed.'
            });
        }

        if (error.message.includes('Only JPEG and PNG')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file type. Only JPEG and PNG images are allowed.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to upload images',
            error: error.message
        });
    }
});

// Upload images during listing creation
router.post('/api/upload-images-temp', isLoggedIn, upload.array('images', 5), async (req, res) => {
    try {
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No images provided'
            });
        }

        // For now, just return success - we'll upload when listing is created
        // This endpoint can be used for image preview/validation
        res.json({
            success: true,
            message: `${files.length} images ready for upload`,
            imageCount: files.length,
            images: files.map((file, index) => ({
                name: file.originalname,
                size: file.size,
                type: file.mimetype,
                preview: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
            }))
        });

    } catch (error) {
        console.error('Error processing images:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process images',
            error: error.message
        });
    }
});

// Delete images for a listing
router.delete('/api/delete-images/:listingId', isLoggedIn, async (req, res) => {
    try {
        const { listingId } = req.params;
        const userId = req.user.id;
        const userName = req.user.name.replace(/[^a-zA-Z0-9]/g, '_');
        const userType = req.user.google_id ? 'google' : 'phone';

        // Verify listing ownership
        const pool = require('../database');
        const listingQuery = `
            SELECT * FROM listings 
            WHERE id = $1 AND user_id = $2 AND user_type = $3
        `;
        
        const listingResult = await pool.query(listingQuery, [listingId, userId, userType]);
        
        if (listingResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found or you do not have permission to delete its images'
            });
        }

        // Delete images from file system
        await simpleImageService.deleteListingImages(userName, userId, listingId);

        // Clear images from database
        const updateQuery = `
            UPDATE listings 
            SET images = '{}', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2 AND user_type = $3
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [listingId, userId, userType]);

        res.json({
            success: true,
            message: 'Images deleted successfully',
            listing: result.rows[0]
        });

    } catch (error) {
        console.error('Error deleting images:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete images',
            error: error.message
        });
    }
});

module.exports = router;