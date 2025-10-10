const pool = require('../database');

/**
 * Service to handle automatic expiry of approved rental requests
 * based on payment time windows
 */

const checkAndExpireRequests = async () => {
    try {
        console.log('[Request Expiry Service] Checking for expired requests...');
        
        const now = new Date();
        
        // Get all approved requests that haven't been paid
        const query = `
            SELECT rr.*, l.id as listing_id
            FROM rental_requests rr
            JOIN listings l ON rr.listing_id = l.id
            WHERE rr.status = 'approved' 
            AND rr.payment_status IS NULL
        `;
        
        const result = await pool.query(query);
        const approvedRequests = result.rows;
        
        let expiredCount = 0;
        
        for (const request of approvedRequests) {
            const approvedAt = new Date(request.updated_at); // When it was approved
            const startDate = new Date(request.start_date);
            
            // Calculate days between approval and start date
            const daysUntilStart = Math.ceil((startDate - approvedAt) / (1000 * 60 * 60 * 24));
            
            // Determine payment window based on days until start
            let paymentWindowHours;
            if (daysUntilStart >= 5) {
                paymentWindowHours = 24; // 1 day
            } else if (daysUntilStart >= 2 && daysUntilStart < 5) {
                paymentWindowHours = 12; // 12 hours
            } else {
                paymentWindowHours = 1; // 1 hour
            }
            
            // Calculate expiry time
            const expiryTime = new Date(approvedAt.getTime() + (paymentWindowHours * 60 * 60 * 1000));
            
            // Check if payment window has expired
            if (now > expiryTime) {
                console.log(`[Request Expiry Service] Expiring request #${request.id} - Payment window of ${paymentWindowHours}h expired`);
                
                // Update request to expired status
                await pool.query(`
                    UPDATE rental_requests 
                    SET status = 'expired',
                        denial_reason = 'Payment period expired. You had ${paymentWindowHours} hour${paymentWindowHours > 1 ? 's' : ''} to complete payment.',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [request.id]);
                
                // Reactivate the listing
                await pool.query(`
                    UPDATE listings 
                    SET is_available = true, 
                        rental_status = 'available'
                    WHERE id = $1
                `, [request.listing_id]);
                
                expiredCount++;
            }
        }
        
        if (expiredCount > 0) {
            console.log(`[Request Expiry Service] Expired ${expiredCount} request(s) and reactivated listings`);
        } else {
            console.log('[Request Expiry Service] No requests expired');
        }
        
    } catch (error) {
        console.error('[Request Expiry Service] Error checking expired requests:', error);
    }
};

// Run every 5 minutes
const startExpiryService = () => {
    console.log('[Request Expiry Service] Starting service...');
    
    // Run immediately on start
    checkAndExpireRequests();
    
    // Then run every 5 minutes
    setInterval(checkAndExpireRequests, 5 * 60 * 1000);
};

module.exports = { startExpiryService, checkAndExpireRequests };
