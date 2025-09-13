const express = require("express");
const passport = require("passport");
const axios = require("axios");
const { findUserByPhone, createPhoneUser, updatePhoneUser } = require("../auth/phoneService");
require("dotenv").config();
require("../auth/passport");

const router = express.Router();

// Store OTP data (this needs to stay with the routes that use it)
const otpStore = {};

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/failed",
  }),
  function (req, res) {
    res.redirect("/dashboard");
  }
);

// Phone OTP routes
router.post("/send-otp", async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expirationTime = Date.now() + 2 * 60 * 1000; // 2 minutes

    // Store OTP with expiration
    otpStore[mobileNumber] = {
      otp: otp,
      expirationTime: expirationTime,
      attempts: 0,
    };

    // For development - use mock OTP
    if (process.env.NODE_ENV === "development") {
      console.log(`📱 DEV OTP for ${mobileNumber}: ${otp}`);
      res.json({
        success: true,
        message: `OTP sent successfully! [Dev Mode - OTP: ${otp}]`,
        expiresIn: 120,
      });
      return;
    }

    // Send OTP via 2Factor.in SMS-only endpoint
    let smsSuccess = false;

    if (process.env.TWOFACTOR_API_KEY) {
      try {
        // Method 1: Try the basic SMS endpoint (SMS only, no voice fallback)
        const smsOnlyResponse = await axios.get(
          `https://2factor.in/API/V1/${process.env.TWOFACTOR_API_KEY}/SMS/${mobileNumber}/${otp}`
        );

        console.log("2Factor SMS-only Response:", smsOnlyResponse.data);

        if (smsOnlyResponse.data.Status === "Success") {
          smsSuccess = true;
          console.log("✅ SMS sent via 2Factor.in SMS-only endpoint");
        }
      } catch (error) {
        console.log("❌ 2Factor SMS-only failed:", error.message);

        // Method 2: Try POST method with explicit SMS type
        try {
          const postResponse = await axios.post(
            "https://2factor.in/API/R1/",
            null,
            {
              params: {
                module: "TRANS_SMS",
                apikey: process.env.TWOFACTOR_API_KEY,
                to: mobileNumber,
                from: "RENTSPH",
                msg: `Your RentSphere login OTP is ${otp}. Valid for 2 minutes. Do not share with anyone.`,
              },
            }
          );

          console.log("2Factor POST Response:", postResponse.data);
          if (postResponse.data.Status === "Success") {
            smsSuccess = true;
            console.log("✅ SMS sent via 2Factor POST method");
          }
        } catch (postError) {
          console.log("❌ 2Factor POST method also failed:", postError.message);

          // Method 3: Try with different SMS template
          try {
            const templateResponse = await axios
              .get(
                `https://2factor.in/API/V1/${process.env.TWOFACTOR_API_KEY}/ADDON_SERVICES/SEND/TSMS`
              )
              .then(() => {
                // Send actual SMS
                return axios.get(
                  `https://2factor.in/API/V1/${process.env.TWOFACTOR_API_KEY}/SMS/${mobileNumber}/${otp}/AUTOGEN`
                );
              });

            console.log("2Factor Template Response:", templateResponse.data);
            if (templateResponse.data.Status === "Success") {
              smsSuccess = true;
              console.log("✅ SMS sent via 2Factor template method");
            }
          } catch (templateError) {
            console.log(
              "❌ 2Factor template method failed:",
              templateError.message
            );
          }
        }
      }
    }

    // Fallback to console logging if no API key is configured
    if (!smsSuccess && !process.env.TWOFACTOR_API_KEY) {
      console.log(`📱 FALLBACK: OTP for ${mobileNumber}: ${otp}`);
      console.log(
        "💡 Configure TWOFACTOR_API_KEY in your .env file for SMS sending"
      );

      res.json({
        success: true,
        message: `OTP generated! Check your server console. [Fallback Mode - OTP: ${otp}]`,
        expiresIn: 120,
      });
      return;
    }

    if (smsSuccess) {
      res.json({
        success: true,
        message: "OTP sent successfully!",
        expiresIn: 120,
      });
    } else {
      console.error("2Factor.in failed");
      res.status(500).json({
        success: false,
        message:
          "Failed to send OTP. Please try again or check server console for fallback OTP.",
      });
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
    });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;

    if (!mobileNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone number and OTP are required",
      });
    }

    const storedOtpData = otpStore[mobileNumber];

    if (!storedOtpData) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or expired",
      });
    }

    // Check if OTP is expired
    if (Date.now() > storedOtpData.expirationTime) {
      delete otpStore[mobileNumber];
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Check attempts
    if (storedOtpData.attempts >= 3) {
      delete otpStore[mobileNumber];
      return res.status(400).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    // Verify OTP
    if (storedOtpData.otp !== otp) {
      storedOtpData.attempts++;
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // OTP is valid - check if user exists
    const fullPhoneNumber = "+91" + mobileNumber;
    let user = await findUserByPhone(fullPhoneNumber);

    if (user) {
      // Existing user - check if profile picture needs to be updated
      if (!user.profile_picture) {
        user = await updatePhoneUser(fullPhoneNumber, {
          name: user.name,
          profilePicture:
            "https://img.icons8.com/?size=100&id=7819&format=png&color=000000",
        });
        console.log(
          "Updated existing user with default profile picture:",
          user
        );
      }

      // Log them in
      req.logIn(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({
            success: false,
            message: "Login failed",
          });
        }

        // Clean up OTP
        delete otpStore[mobileNumber];

        res.json({
          success: true,
          message: "Login successful!",
          isNewUser: false,
        });
      });
    } else {
      // New user - need registration
      // Store phone in session for registration
      req.session.pendingPhone = fullPhoneNumber;

      // Clean up OTP
      delete otpStore[mobileNumber];

      res.json({
        success: true,
        message: "OTP verified. Please complete registration.",
        isNewUser: true,
      });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      message: "Verification failed. Please try again.",
    });
  }
});

router.post("/complete-phone-registration", async (req, res) => {
  try {
    const { name } = req.body;
    const phone = req.session.pendingPhone;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "No pending registration found",
      });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Valid name is required",
      });
    }

    // Create new user with default profile picture
    const userData = {
      phone: phone,
      name: name.trim(),
      profilePicture:
        "https://img.icons8.com/?size=100&id=7819&format=png&color=000000", // Default user icon
    };

    const newUser = await createPhoneUser(userData);
    console.log("New phone user created:", newUser); // Debug log

    // Log in the new user
    req.logIn(newUser, (err) => {
      if (err) {
        console.error("Login error after registration:", err);
        return res.status(500).json({
          success: false,
          message: "Registration successful but login failed",
        });
      }

      // Clean up session
      delete req.session.pendingPhone;

      res.json({
        success: true,
        message: "Registration completed successfully!",
      });
    });
  } catch (error) {
    console.error("Error completing registration:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
});

// Cleanup expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [phone, data] of Object.entries(otpStore)) {
    if (now > data.expirationTime) {
      delete otpStore[phone];
    }
  }
}, 60000);

module.exports = router;