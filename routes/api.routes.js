const express = require("express");
const { isLoggedIn } = require("../middleware/auth");
const router = express.Router();

// API endpoint for user data (works for both Google and Phone users)
router.get("/api/user", isLoggedIn, async (req, res) => {
  try {
    console.log("API user request for:", req.user);
    
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

    console.log(`Found ${result.rows.length} users with null profile pictures`);

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

module.exports = router;