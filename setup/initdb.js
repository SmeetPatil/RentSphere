const pool = require('../database');

async function createUsersTable() {
    try {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                google_id VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                profile_picture VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await pool.query(createTableQuery);
        console.log('Users table created successfully');

        // Create index for faster lookups
        await pool.query('CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)');
        console.log('Database setup complete');

    } catch (error) {
        console.error('Error setting up database:', error);
    }
}

// Run this function
createUsersTable();