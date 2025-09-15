const pool = require('../database');

async function createMessagingTables() {
    try {
        // Create conversations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,
                user1_id INTEGER NOT NULL,
                user1_type VARCHAR(10) NOT NULL, -- 'google' or 'phone'
                user2_id INTEGER NOT NULL,
                user2_type VARCHAR(10) NOT NULL, -- 'google' or 'phone'
                last_message_id INTEGER,
                last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user1_id, user1_type, user2_id, user2_type)
            )
        `);

        // Create messages table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                sender_id INTEGER NOT NULL,
                sender_type VARCHAR(10) NOT NULL, -- 'google' or 'phone'
                message_text TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes for better performance
        await pool.query('CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations(user1_id, user1_type, user2_id, user2_type)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, sender_type)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC)');

        console.log('✅ Messaging tables created successfully!');
        
    } catch (error) {
        console.error('❌ Error creating messaging tables:', error);
        throw error;
    }
}

// Export for use in setup
module.exports = { createMessagingTables };

// Run directly if called
if (require.main === module) {
    createMessagingTables()
        .then(() => {
            console.log('Messaging tables setup complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Setup failed:', error);
            process.exit(1);
        });
}