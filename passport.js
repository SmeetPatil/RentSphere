// noinspection SqlResolve
require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const { findUserByGoogleId, createUser, updateUser } = require('./userService');
const pool = require('./database')


passport.serializeUser(function(user,done) {
    done(null,user.id);
});

passport.deserializeUser(async function(id, done) {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return done(new Error('User not found'), null);
        }
        console.log('Found user:', result.rows[0].email);
        done(null, result.rows[0]);
    } catch (error) {
        console.error('Error deserializing user:', error);
        done(error, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:8085/google/callback',
        passReqToCallback   : true
    },
    async function(request, accessToken, refreshToken, profile, done) {
        try {
            // Check if user already exists
            let user = await findUserByGoogleId(profile.id);

            if (user) {
                // User exists, update their info in case it changed
                user = await updateUser(profile.id, {
                    email: profile.emails[0].value,
                    name: profile.displayName,
                    profilePicture: profile.photos[0].value
                });
                console.log('Existing user logged in:', user.email);
            } else {
                // New user, create them
                user = await createUser({
                    googleId: profile.id,
                    email: profile.emails[0].value,
                    name: profile.displayName,
                    profilePicture: profile.photos[0].value
                });
                console.log('New user created:', user.email);
            }

            return done(null, user);
        } catch (error) {
            console.error('Authentication error:', error);
            return done(error, null);
        }
    }));

