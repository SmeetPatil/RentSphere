// noinspection SqlResolve

const pool = require('./database');

// Find user by Google ID
async function findUserByGoogleId(googleId) {
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE google_id = $1',
            [googleId]
        );
        return result.rows[0]; // Returns undefined if not found
    } catch (error) {
        console.error('Error finding user:', error);
        throw error;
    }
}

// Create new user
async function createUser(userData) {
    try {
        const { googleId, email, name, profilePicture } = userData;
        const result = await pool.query(
            `-- noinspection SqlResolveForFile

INSERT INTO users (google_id, email, name, profile_picture) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [googleId, email, name, profilePicture]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

// Update existing user
async function updateUser(googleId, userData) {
    try {
        const { email, name, profilePicture } = userData;
        const result = await pool.query(
            `UPDATE users 
             SET email = $2, name = $3, profile_picture = $4, updated_at = CURRENT_TIMESTAMP 
             WHERE google_id = $1 
             RETURNING *`,
            [googleId, email, name, profilePicture]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
}

module.exports = {
    findUserByGoogleId,
    createUser,
    updateUser
};