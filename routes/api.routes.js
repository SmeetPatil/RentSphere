const express = require("express");
const { isLoggedIn } = require("../middleware/auth");
const router = express.Router();

// API endpoint for user data (works for both Google and Phone users)
router.get("/api/user", isLoggedIn, async (req, res) => {
  try {
    
    const pool = require("../database");
    
    // Get user's primary contact info
    const userEmail = req.user.email || null;
    const userPhone = req.user.phone || null;
    
    // Look up additional contact info from profile_info table
    let additionalEmail = null;
    let additionalPhone = null;
    
    if (userEmail) {
      // Google user - check for additional phone in profile_info
      const profileResult = await pool.query(
        'SELECT phone FROM profile_info WHERE email = $1',
        [userEmail]
      );
      if (profileResult.rows.length > 0) {
        additionalPhone = profileResult.rows[0].phone;
      }
    } else if (userPhone) {
      // Phone user - check for additional email in profile_info
      const profileResult = await pool.query(
        'SELECT email FROM profile_info WHERE phone = $1',
        [userPhone]
      );
      if (profileResult.rows.length > 0) {
        additionalEmail = profileResult.rows[0].email;
      }
    }
    
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: userEmail || additionalEmail,
      phone: userPhone || additionalPhone,
      profilePicture: req.user.profile_picture || req.user.profilePicture,
      memberSince: req.user.created_at,
      kycVerified: req.user.kyc_verified || false,
      kycStatus: req.user.kyc_status || 'pending',
      kycVerifiedAt: req.user.kyc_verified_at || null,
    });
    
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      error: "Failed to fetch user data"
    });
  }
});

// API endpoint to update user profile
router.put("/api/user/update", isLoggedIn, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters long",
      });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Validate phone format if provided (Indian mobile numbers)
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      // Handle both formats: "8928239639" (10 digits) or "+918928239639" (13 digits with +91)
      const isValid =
        (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) ||
        (cleanPhone.length === 12 &&
          cleanPhone.startsWith("91") &&
          /^91[6-9]/.test(cleanPhone));

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number. Must be 10 digits starting with 6-9",
        });
      }
    }

    const pool = require("../database");

    // Get user's primary contact info (email for Google users, phone for phone users)
    let userEmail = null;
    let userPhone = null;
    
    if (req.user.google_id) {
      // Google user - update name in users table only
      userEmail = req.user.email;
      
      const updateQuery = `
        UPDATE users 
        SET name = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [name.trim(), userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      
      // Update session user data
      req.user.name = result.rows[0].name;
      
    } else {
      // Phone user - update name in phone_users table only
      userPhone = req.user.phone;
      
      const updateQuery = `
        UPDATE phone_users 
        SET name = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [name.trim(), userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      
      // Update session user data
      req.user.name = result.rows[0].name;
    }

    // Handle profile_info table for additional contact information
    if (email || phone) {
      // Check if profile_info entry exists for this user's primary contact
      const primaryContact = userEmail || userPhone;
      const primaryField = userEmail ? 'email' : 'phone';
      
      const existingProfileResult = await pool.query(
        `SELECT * FROM profile_info WHERE ${primaryField} = $1`,
        [primaryContact]
      );
      
      if (existingProfileResult.rows.length > 0) {
        // Update existing profile_info entry
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;
        
        if (email && !userEmail) {
          updateFields.push(`email = $${paramCount++}`);
          updateValues.push(email);
        }
        if (phone && !userPhone) {
          updateFields.push(`phone = $${paramCount++}`);
          updateValues.push(phone);
        }
        
        if (updateFields.length > 0) {
          updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
          updateValues.push(primaryContact);
          
          const updateProfileQuery = `
            UPDATE profile_info 
            SET ${updateFields.join(', ')}
            WHERE ${primaryField} = $${paramCount}
          `;
          await pool.query(updateProfileQuery, updateValues);
        }
      } else {
        // Create new profile_info entry
        const insertQuery = `
          INSERT INTO profile_info (email, phone, created_at, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        await pool.query(insertQuery, [
          userEmail || email || null,
          userPhone || phone || null
        ]);
      }
    }

    // Get updated profile info for response
    const primaryContact = userEmail || userPhone;
    const primaryField = userEmail ? 'email' : 'phone';
    
    const profileInfoResult = await pool.query(
      `SELECT * FROM profile_info WHERE ${primaryField} = $1`,
      [primaryContact]
    );
    
    const profileInfo = profileInfoResult.rows[0] || {};
    
    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: userId,
        name: req.user.name,
        email: userEmail || profileInfo.email || null,
        phone: userPhone || profileInfo.phone || null,
        profilePicture: req.user.profile_picture || req.user.profilePicture,
        memberSince: req.user.created_at,
      },
    });

  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating profile",
    });
  }
});

// Admin API to fix profile pictures
router.post("/admin/fix-profile-pictures", async (req, res) => {
  try {
    const { updatePhoneUser } = require("../auth/phoneService");
    const pool = require("../database");

    // Find all phone users with null profile pictures
    const result = await pool.query(
      "SELECT * FROM phone_users WHERE profile_picture IS NULL"
    );

    // Update each user
    for (const user of result.rows) {
      await updatePhoneUser(user.phone, {
        name: user.name,
        profilePicture:
          "https://img.icons8.com/?size=100&id=7819&format=png&color=000000",
      });
    }

    res.json({
      success: true,
      message: `Updated ${result.rows.length} users with default profile pictures`,
    });
  } catch (error) {
    console.error("Error fixing profile pictures:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile pictures",
    });
  }
});

// Get user profile by ID and type
router.get("/api/users/profile", async (req, res) => {
  try {
    const { userId, userType } = req.query;
    
    if (!userId || !userType) {
      return res.status(400).json({
        success: false,
        message: "userId and userType are required"
      });
    }

    const pool = require("../database");
    let user = null;

    if (userType === 'google') {
      const result = await pool.query(
        'SELECT id, email as contact, name, profile_picture, created_at, \'google\' as user_type FROM users WHERE id = $1',
        [userId]
      );
      if (result.rows.length > 0) {
        user = result.rows[0];
        user.email = user.contact;
      }
    } else if (userType === 'phone') {
      const result = await pool.query(
        'SELECT id, phone as contact, name, profile_picture, created_at, \'phone\' as user_type FROM phone_users WHERE id = $1',
        [userId]
      );
      if (result.rows.length > 0) {
        user = result.rows[0];
        user.phone = user.contact;
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile"
    });
  }
});

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

// Get nearby rentals based on user location (public endpoint)
router.get("/api/nearby-rentals", async (req, res) => {
  try {
    const { latitude, longitude, limit = 10 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required"
      });
    }

    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);
    const maxResults = parseInt(limit);

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude"
      });
    }

    const pool = require("../database");
    
    // Fetch all active listings with location data
    const query = `
      SELECT 
        l.*,
        COALESCE(u.name, pu.name) as user_name,
        COALESCE(u.profile_picture, pu.profile_picture) as user_profile_picture,
        COALESCE(u.kyc_verified, pu.kyc_verified) as user_kyc_verified
      FROM listings l
      LEFT JOIN users u ON l.user_type = 'google' AND l.user_id = u.id
      LEFT JOIN phone_users pu ON l.user_type = 'phone' AND l.user_id = pu.id
      WHERE l.latitude IS NOT NULL 
        AND l.longitude IS NOT NULL
        AND l.is_available = true
      ORDER BY l.created_at DESC
    `;
    
    const result = await pool.query(query);
    
    // Calculate distances and sort by proximity
    const listingsWithDistance = result.rows.map(listing => {
      const distance = calculateDistance(
        userLat,
        userLng,
        parseFloat(listing.latitude),
        parseFloat(listing.longitude)
      );
      
      return {
        ...listing,
        distance: Math.round(distance * 10) / 10 // Round to 1 decimal place
      };
    });
    
    // Sort by distance and limit results
    const nearbyListings = listingsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxResults);
    
    res.json({
      success: true,
      listings: nearbyListings,
      userLocation: {
        latitude: userLat,
        longitude: userLng
      }
    });

  } catch (error) {
    console.error("Error fetching nearby rentals:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch nearby rentals"
    });
  }
});

// Get featured/recent rentals (public endpoint)
router.get("/api/featured-rentals", async (req, res) => {
  try {
    const { limit = 12 } = req.query;
    const maxResults = parseInt(limit);

    const pool = require("../database");
    
    // Fetch recent active listings with user info
    const query = `
      SELECT 
        l.*,
        COALESCE(u.name, pu.name) as user_name,
        COALESCE(u.profile_picture, pu.profile_picture) as user_profile_picture,
        COALESCE(u.kyc_verified, pu.kyc_verified) as user_kyc_verified
      FROM listings l
      LEFT JOIN users u ON l.user_type = 'google' AND l.user_id = u.id
      LEFT JOIN phone_users pu ON l.user_type = 'phone' AND l.user_id = pu.id
      WHERE l.is_available = true
        AND l.images IS NOT NULL
        AND array_length(l.images, 1) > 0
      ORDER BY l.created_at DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [maxResults]);
    
    res.json({
      success: true,
      listings: result.rows
    });

  } catch (error) {
    console.error("Error fetching featured rentals:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch featured rentals"
    });
  }
});

// Get user dashboard statistics
router.get("/api/user-stats", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.google_id ? 'google' : 'phone';
    const pool = require("../database");
    
    // Count active listings
    const listingsResult = await pool.query(
      'SELECT COUNT(*) as count FROM listings WHERE user_id = $1 AND user_type = $2 AND is_available = $3',
      [userId, userType, true]
    );
    
    // Count unread messages (conversations where user is recipient and has unread messages)
    const messagesResult = await pool.query(
      `SELECT COUNT(DISTINCT c.id) as count 
       FROM conversations c
       JOIN messages m ON c.id = m.conversation_id
       WHERE ((c.user1_id = $1 AND c.user1_type = $2 AND m.sender_id != $1)
          OR (c.user2_id = $1 AND c.user2_type = $2 AND m.sender_id != $1))
         AND m.is_read = false`,
      [userId, userType]
    );
    
    // Count total views across all user's listings (if views column exists)
    let totalViews = 0;
    try {
      const viewsResult = await pool.query(
        'SELECT COALESCE(SUM(views), 0) as total FROM listings WHERE user_id = $1 AND user_type = $2',
        [userId, userType]
      );
      totalViews = parseInt(viewsResult.rows[0].total) || 0;
    } catch (error) {
      // Views column might not exist, default to 0
      console.log('Views column not found, defaulting to 0');
    }
    
    // Count active rental requests sent by user
    const requestsResult = await pool.query(
      'SELECT COUNT(*) as count FROM rental_requests WHERE renter_user_id = $1 AND renter_user_type = $2 AND status = $3',
      [userId, userType, 'pending']
    );
    
    res.json({
      success: true,
      stats: {
        activeListings: parseInt(listingsResult.rows[0].count) || 0,
        unreadMessages: parseInt(messagesResult.rows[0].count) || 0,
        totalViews: totalViews,
        activeRentals: parseInt(requestsResult.rows[0].count) || 0
      }
    });

  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user statistics"
    });
  }
});

module.exports = router;