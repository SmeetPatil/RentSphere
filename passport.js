// noinspection SqlResolve
require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const { findUserByGoogleId, createUser, updateUser } = require('./userService');
const { findPhoneUserById } = require('./phoneService');
const pool = require('./database')


passport.serializeUser(function(user, done) {
    const sessionData = {
        id: user.id,
        type: user.phone ? 'phone' : 'google' // Determine user type
    };
    console.log('Serializing user:', sessionData); // Debug log
    done(null, sessionData);
});

passport.deserializeUser(async function(sessionData, done) {
    try {
        let user;
        console.log('Deserializing user:', sessionData); // Debug log

        if (sessionData.type === 'phone') {
            user = await findPhoneUserById(sessionData.id); // Added await
        } else {
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [sessionData.id]);
            user = result.rows[0];
        }

        console.log('Deserialized user:', user); // Debug log
        done(null, user);
    } catch (error) {
        console.error('Deserialization error:', error);
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

