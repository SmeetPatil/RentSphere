const db = require('../database');

const updateLastActive = async (req, res, next) => {
    if (req.user && req.user.id) {
        try {
            const table = req.user.google_id ? 'users' : 'phone_users';
            await db.query(
                `UPDATE ${table} SET last_active = CURRENT_TIMESTAMP WHERE id = $1`,
                [req.user.id]
            );
        } catch (error) {
            // Don't block the request if this fails
            console.error('Error updating last_active:', error);
        }
    }
    next();
};

module.exports = updateLastActive;
