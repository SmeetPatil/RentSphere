const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('✅ Successfully connected to PostgreSQL');

        // Test query
        const result = await client.query('SELECT NOW()');
        console.log('Current time from database:', result.rows[0].now);

        client.release();

        // List all tables to see what exists
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Existing tables:', tablesResult.rows);

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await pool.end();
    }
}

testConnection();