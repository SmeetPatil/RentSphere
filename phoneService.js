const pool = require('./database');

async function findUserByPhone(phone) {
    try {
        const result = await pool.query(
            'SELECT * FROM phone_users WHERE phone = $1',
            [phone]
        );
        console.log('Finding user by phone:', phone, 'Result:', result.rows[0]); // Debug log
        return result.rows[0]; // Returns undefined if not found
    } catch (error) {
        console.error('Error finding user by phone:', error);
        throw error;
    }
}

async function createPhoneUser(userData) {
    try {
        const { phone, name, profilePicture } = userData;
        console.log('Creating phone user with data:', userData); // Debug log

        const result = await pool.query(
            `INSERT INTO phone_users (phone, name, profile_picture, created_at) 
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
             RETURNING *`,
            [phone, name, profilePicture || 'https://img.icons8.com/?size=100&id=7819&format=png&color=000000']
        );

        console.log('Phone user created:', result.rows[0]); // Debug log
        return result.rows[0];
    } catch (error) {
        console.error('Error creating phone user:', error);
        throw error;
    }
}

async function updatePhoneUser(phone, userData) {
    try {
        const { name, profilePicture } = userData;
        const result = await pool.query(
            `UPDATE phone_users
             SET name = $2, profile_picture = $3, updated_at = CURRENT_TIMESTAMP
             WHERE phone = $1
             RETURNING *`,
            [phone, name, profilePicture]
        );
        console.log('Phone user updated:', result.rows[0]); // Debug log
        return result.rows[0];
    } catch (error) {
        console.error('Error updating phone user:', error);
        throw error;
    }
}

async function findPhoneUserById(id) {
    try {
        const result = await pool.query(
            'SELECT * FROM phone_users WHERE id = $1',
            [id]
        );
        console.log('Finding phone user by ID:', id, 'Result:', result.rows[0]); // Debug log
        return result.rows[0];
    } catch (error) {
        console.error('Error finding phone user by ID:', error);
        throw error;
    }
}

module.exports = {
    findUserByPhone,
    createPhoneUser,
    updatePhoneUser,
    findPhoneUserById
};