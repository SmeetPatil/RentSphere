const express = require('express');
const { isLoggedIn } = require('../middleware/auth');
const router = express.Router();

// Get user's conversations
router.get('/api/conversations', isLoggedIn, async (req, res) => {
    try {
        const pool = require('../database');
        const userId = req.user.id;
        const userType = req.user.google_id ? 'google' : 'phone';

        const query = `
            SELECT 
                c.*,
                m.message_text as last_message,
                m.created_at as last_message_time,
                -- Get other user info
                CASE 
                    WHEN c.user1_id = $1 AND c.user1_type = $2 THEN c.user2_id
                    ELSE c.user1_id
                END as other_user_id,
                CASE 
                    WHEN c.user1_id = $1 AND c.user1_type = $2 THEN c.user2_type
                    ELSE c.user1_type
                END as other_user_type
            FROM conversations c
            LEFT JOIN messages m ON c.last_message_id = m.id
            WHERE (c.user1_id = $1 AND c.user1_type = $2) 
               OR (c.user2_id = $1 AND c.user2_type = $2)
            ORDER BY c.last_message_at DESC
        `;

        const result = await pool.query(query, [userId, userType]);
        
        // Get other user details for each conversation
        const conversations = await Promise.all(result.rows.map(async (conv) => {
            let otherUser = null;
            
            if (conv.other_user_type === 'google') {
                const userResult = await pool.query(
                    'SELECT id, name, email, profile_picture FROM users WHERE id = $1',
                    [conv.other_user_id]
                );
                otherUser = userResult.rows[0];
            } else {
                const userResult = await pool.query(
                    'SELECT id, name, phone, profile_picture FROM phone_users WHERE id = $1',
                    [conv.other_user_id]
                );
                otherUser = userResult.rows[0];
            }

            return {
                id: conv.id,
                otherUser: otherUser,
                lastMessage: conv.last_message,
                lastMessageTime: conv.last_message_time,
                updatedAt: conv.updated_at
            };
        }));

        res.json({ success: true, conversations });

    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
    }
});

// Get messages for a specific conversation
router.get('/api/conversations/:conversationId/messages', isLoggedIn, async (req, res) => {
    try {
        const pool = require('../database');
        const { conversationId } = req.params;
        const userId = req.user.id;
        const userType = req.user.google_id ? 'google' : 'phone';

        // Verify user is part of this conversation
        const conversationQuery = `
            SELECT * FROM conversations 
            WHERE id = $1 AND (
                (user1_id = $2 AND user1_type = $3) OR 
                (user2_id = $2 AND user2_type = $3)
            )
        `;
        const conversationResult = await pool.query(conversationQuery, [conversationId, userId, userType]);
        
        if (conversationResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Access denied to this conversation' });
        }

        // Get messages
        const messagesQuery = `
            SELECT * FROM messages
            WHERE conversation_id = $1
            ORDER BY created_at ASC
        `;
        const messagesResult = await pool.query(messagesQuery, [conversationId]);
        
        // Mark messages as read
        const updateQuery = `
            UPDATE messages
            SET is_read = TRUE
            WHERE conversation_id = $1 
            AND sender_id != $2
            AND sender_type != $3
            AND is_read = FALSE
        `;
        await pool.query(updateQuery, [conversationId, userId, userType]);

        res.json({ success: true, messages: messagesResult.rows });

    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
});

// Send a message
router.post('/api/conversations/:conversationId/messages', isLoggedIn, async (req, res) => {
    try {
        const pool = require('../database');
        const { conversationId } = req.params;
        const { messageText } = req.body;
        const userId = req.user.id;
        const userType = req.user.google_id ? 'google' : 'phone';

        if (!messageText || messageText.trim() === '') {
            return res.status(400).json({ success: false, message: 'Message text is required' });
        }

        // Verify user is part of this conversation
        const conversationQuery = `
            SELECT * FROM conversations 
            WHERE id = $1 AND (
                (user1_id = $2 AND user1_type = $3) OR 
                (user2_id = $2 AND user2_type = $3)
            )
        `;
        const conversationResult = await pool.query(conversationQuery, [conversationId, userId, userType]);
        
        if (conversationResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Access denied to this conversation' });
        }

        // Insert message
        const insertQuery = `
            INSERT INTO messages (conversation_id, sender_id, sender_type, message_text)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const messageResult = await pool.query(insertQuery, [conversationId, userId, userType, messageText.trim()]);
        const newMessage = messageResult.rows[0];

        // Update conversation's last message
        const updateQuery = `
            UPDATE conversations
            SET last_message_id = $1, last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `;
        await pool.query(updateQuery, [newMessage.id, conversationId]);

        res.json({ success: true, message: newMessage });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
});

// Start a new conversation
router.post('/api/conversations', isLoggedIn, async (req, res) => {
    try {
        const pool = require('../database');
        const { recipientId, recipientType, initialMessage } = req.body;
        const userId = req.user.id;
        const userType = req.user.google_id ? 'google' : 'phone';

        if (!recipientId || !recipientType || !initialMessage) {
            return res.status(400).json({ 
                success: false, 
                message: 'Recipient ID, type, and initial message are required' 
            });
        }

        // Check if conversation already exists
        const checkQuery = `
            SELECT * FROM conversations
            WHERE (user1_id = $1 AND user1_type = $2 AND user2_id = $3 AND user2_type = $4)
            OR (user1_id = $3 AND user1_type = $4 AND user2_id = $1 AND user2_type = $2)
        `;
        const checkResult = await pool.query(checkQuery, [userId, userType, recipientId, recipientType]);
        
        let conversationId;
        
        if (checkResult.rows.length > 0) {
            // Conversation exists
            conversationId = checkResult.rows[0].id;
        } else {
            // Create new conversation
            const insertQuery = `
                INSERT INTO conversations (user1_id, user1_type, user2_id, user2_type)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const conversationResult = await pool.query(insertQuery, [userId, userType, recipientId, recipientType]);
            conversationId = conversationResult.rows[0].id;
        }

        // Add initial message
        const messageQuery = `
            INSERT INTO messages (conversation_id, sender_id, sender_type, message_text)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const messageResult = await pool.query(messageQuery, [conversationId, userId, userType, initialMessage.trim()]);
        const newMessage = messageResult.rows[0];

        // Update conversation's last message
        const updateQuery = `
            UPDATE conversations
            SET last_message_id = $1, last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        const updatedConversation = await pool.query(updateQuery, [newMessage.id, conversationId]);

        res.json({ 
            success: true, 
            conversation: updatedConversation.rows[0],
            message: newMessage
        });

    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ success: false, message: 'Failed to create conversation' });
    }
});

// Search users to message
router.get('/api/users/search', isLoggedIn, async (req, res) => {
    try {
        const pool = require('../database');
        const { query } = req.query;
        const userId = req.user.id;
        const userType = req.user.google_id ? 'google' : 'phone';

        if (!query || query.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
        }

        // Search Google users
        const googleUsersQuery = `
            SELECT id, name, email, profile_picture, 'google' as user_type
            FROM users
            WHERE (name ILIKE $1 OR email ILIKE $1)
            AND NOT (id = $2 AND $3 = 'google')
            LIMIT 10
        `;
        const googleUsers = await pool.query(googleUsersQuery, [`%${query}%`, userId, userType]);

        // Search Phone users
        const phoneUsersQuery = `
            SELECT id, name, phone, profile_picture, 'phone' as user_type
            FROM phone_users
            WHERE (name ILIKE $1 OR phone ILIKE $1)
            AND NOT (id = $2 AND $3 = 'phone')
            LIMIT 10
        `;
        const phoneUsers = await pool.query(phoneUsersQuery, [`%${query}%`, userId, userType]);

        // Combine results
        const users = [...googleUsers.rows, ...phoneUsers.rows];

        res.json({ success: true, users });

    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ success: false, message: 'Failed to search users' });
    }
});

module.exports = router;