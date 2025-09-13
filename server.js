const express = require('express');
const passport = require('passport');
const session = require('express-session');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
require('./auth/passport');
const { findUserByPhone, createPhoneUser, updatePhoneUser } = require('./auth/phoneService');
const app = express();


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));


//Create session
app.use(session({
    resave: false,
    secret: ['key1','key2'],
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

const isLoggedIn = (req, res, next) => {
    if (req.user) {
        next();
    }
    else {
        res.sendStatus(401);
    }
};

app.use(passport.initialize());
app.use(passport.session());

const port = process.env.PORT;

app.post('/admin/fix-profile-pictures', async (req, res) => {
    try {
        const { updatePhoneUser } = require('./auth/phoneService');
        const pool = require('./database');

        // Find all phone users with null profile pictures
        const result = await pool.query(
            'SELECT * FROM phone_users WHERE profile_picture IS NULL'
        );

        console.log(`Found ${result.rows.length} users with null profile pictures`);

        // Update each user
        for (const user of result.rows) {
            await updatePhoneUser(user.phone, {
                name: user.name,
                profilePicture: 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000'
            });
        }

        res.json({
            success: true,
            message: `Updated ${result.rows.length} users with default profile pictures`
        });
    } catch (error) {
        console.error('Error fixing profile pictures:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile pictures'
        });
    }
});

// Root route
app.get('/', (req, res) => {
    if (req.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Login page route
app.get('/login', (req, res) => {
    if (req.user) {
        return res.redirect('/dashboard'); // Added 'return' here
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html')); // Fixed file path
});

// Dashboard route
app.get('/dashboard', isLoggedIn, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html')); // Fixed file path
});

// Failed authentication route
app.get('/failed', (req, res) => {
    res.redirect('/login');
    window.alert("Authentication failed, please try again")
});

// Success route (redirect to dashboard, not file path)
app.get('/success', isLoggedIn, (req, res) => {
    res.redirect('/dashboard'); // Changed from file path to route
});

// API endpoint for user data (works for both Google and Phone users)
app.get('/api/user', isLoggedIn, (req, res) => {
    console.log('API user request for:', req.user);
    res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email || null,
        phone: req.user.phone || null,
        profilePicture: req.user.profile_picture || req.user.profilePicture,
        memberSince: req.user.created_at
    });
});

// Google OAuth routes
app.get('/google',
    passport.authenticate('google', {
        scope: ['email', 'profile']
    })
);

app.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/failed' // Changed to route, not file path
    }),
    function(req, res) {
        res.redirect('/dashboard'); // Changed to route, not file path
    }
);

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => { // Proper session destruction
        if (err) {
            console.log('Error destroying session:', err);
        }
        res.redirect('/login'); // Changed to route, not file path
    });
});

// Phone Verfication
const otpStore = {};
app.get('/phone', (req, res) => {
    if (req.user) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, './public/phone.html'));
});


app.post('/send-otp', async (req, res) => {
    try {
        const { mobileNumber } = req.body;

        if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format'
            });
        }

        // Generate 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const expirationTime = Date.now() + (2 * 60 * 1000); // 2 minutes

        // Store OTP with expiration
        otpStore[mobileNumber] = {
            otp: otp,
            expirationTime: expirationTime,
            attempts: 0
        };

        // For development - use mock OTP
        if (process.env.NODE_ENV === 'development') {
            console.log(`📱 DEV OTP for ${mobileNumber}: ${otp}`);
            res.json({
                success: true,
                message: `OTP sent successfully! [Dev Mode - OTP: ${otp}]`,
                expiresIn: 120
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

                console.log('2Factor SMS-only Response:', smsOnlyResponse.data);

                if (smsOnlyResponse.data.Status === 'Success') {
                    smsSuccess = true;
                    console.log('✅ SMS sent via 2Factor.in SMS-only endpoint');
                }
            } catch (error) {
                console.log('❌ 2Factor SMS-only failed:', error.message);

                // Method 2: Try POST method with explicit SMS type
                try {
                    const postResponse = await axios.post('https://2factor.in/API/R1/', null, {
                        params: {
                            module: 'TRANS_SMS',
                            apikey: process.env.TWOFACTOR_API_KEY,
                            to: mobileNumber,
                            from: 'RENTSPH',
                            msg: `Your RentSphere login OTP is ${otp}. Valid for 2 minutes. Do not share with anyone.`
                        }
                    });

                    console.log('2Factor POST Response:', postResponse.data);
                    if (postResponse.data.Status === 'Success') {
                        smsSuccess = true;
                        console.log('✅ SMS sent via 2Factor POST method');
                    }
                } catch (postError) {
                    console.log('❌ 2Factor POST method also failed:', postError.message);

                    // Method 3: Try with different SMS template
                    try {
                        const templateResponse = await axios.get(
                            `https://2factor.in/API/V1/${process.env.TWOFACTOR_API_KEY}/ADDON_SERVICES/SEND/TSMS`
                        ).then(() => {
                            // Send actual SMS
                            return axios.get(
                                `https://2factor.in/API/V1/${process.env.TWOFACTOR_API_KEY}/SMS/${mobileNumber}/${otp}/AUTOGEN`
                            );
                        });

                        console.log('2Factor Template Response:', templateResponse.data);
                        if (templateResponse.data.Status === 'Success') {
                            smsSuccess = true;
                            console.log('✅ SMS sent via 2Factor template method');
                        }
                    } catch (templateError) {
                        console.log('❌ 2Factor template method failed:', templateError.message);
                    }
                }
            }
        }

        // Fallback to console logging if no API key is configured
        if (!smsSuccess && !process.env.TWOFACTOR_API_KEY) {
            console.log(`📱 FALLBACK: OTP for ${mobileNumber}: ${otp}`);
            console.log('💡 Configure TWOFACTOR_API_KEY in your .env file for SMS sending');

            res.json({
                success: true,
                message: `OTP generated! Check your server console. [Fallback Mode - OTP: ${otp}]`,
                expiresIn: 120
            });
            return;
        }

        if (smsSuccess) {
            res.json({
                success: true,
                message: 'OTP sent successfully!',
                expiresIn: 120
            });
        } else {
            console.error('2Factor.in failed');
            res.status(500).json({
                success: false,
                message: 'Failed to send OTP. Please try again or check server console for fallback OTP.'
            });
        }

    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP. Please try again.'
        });
    }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { mobileNumber, otp } = req.body;

        if (!mobileNumber || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and OTP are required'
            });
        }

        const storedOtpData = otpStore[mobileNumber];

        if (!storedOtpData) {
            return res.status(400).json({
                success: false,
                message: 'OTP not found or expired'
            });
        }

        // Check if OTP is expired
        if (Date.now() > storedOtpData.expirationTime) {
            delete otpStore[mobileNumber];
            return res.status(400).json({
                success: false,
                message: 'OTP has expired'
            });
        }

        // Check attempts
        if (storedOtpData.attempts >= 3) {
            delete otpStore[mobileNumber];
            return res.status(400).json({
                success: false,
                message: 'Too many failed attempts. Please request a new OTP.'
            });
        }

        // Verify OTP
        if (storedOtpData.otp !== otp) {
            storedOtpData.attempts++;
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        // OTP is valid - check if user exists
        const fullPhoneNumber = '+91' + mobileNumber;
        let user = await findUserByPhone(fullPhoneNumber);

        if (user) {
            // Existing user - check if profile picture needs to be updated
            if (!user.profile_picture) {
                const { updatePhoneUser } = require('./auth/phoneService');
                user = await updatePhoneUser(fullPhoneNumber, {
                    name: user.name,
                    profilePicture: 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000'
                });
                console.log('Updated existing user with default profile picture:', user);
            }

            // Log them in
            req.logIn(user, (err) => {
                if (err) {
                    console.error('Login error:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Login failed'
                    });
                }

                // Clean up OTP
                delete otpStore[mobileNumber];

                res.json({
                    success: true,
                    message: 'Login successful!',
                    isNewUser: false
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
                message: 'OTP verified. Please complete registration.',
                isNewUser: true
            });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed. Please try again.'
        });
    }
});

app.post('/complete-phone-registration', async (req, res) => {
    try {
        const { name } = req.body;
        const phone = req.session.pendingPhone;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'No pending registration found'
            });
        }

        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Valid name is required'
            });
        }

        // Create new user with default profile picture
        const userData = {
            phone: phone,
            name: name.trim(),
            profilePicture: 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000' // Default user icon
        };

        const newUser = await createPhoneUser(userData);
        console.log('New phone user created:', newUser); // Debug log

        // Log in the new user
        req.logIn(newUser, (err) => {
            if (err) {
                console.error('Login error after registration:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Registration successful but login failed'
                });
            }

            // Clean up session
            delete req.session.pendingPhone;

            res.json({
                success: true,
                message: 'Registration completed successfully!'
            });
        });
    } catch (error) {
        console.error('Error completing registration:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
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

app.listen(8085, () => {
    console.log("RentSphere is running on port : " + port + " at ==> http://localhost:8085/");
});