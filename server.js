const express = require('express');
const passport = require('passport');
const session = require('express-session');
const path = require('path');

require('./passport');

const app = express();

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

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

const port = process.env.PORT || 8085;

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

// API endpoint for user data
app.get('/api/user', isLoggedIn, (req, res) => {
    res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        profilePicture: req.user.profile_picture,
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

app.listen(8085, () => {
    console.log("RentSphere is running on port : " + port + " at ==> http://localhost:8085/");
});