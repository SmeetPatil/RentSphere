const db = require('../database');

async function resetDeliveryPayments() {
    try {
        console.log('🔄 Starting delivery payment reset...\n');
        
        // Find all requests that have delivery payments
        const deliveryRequests = await db.query(`
            SELECT rr.id, rr.listing_id, l.title, rr.renter_user_id, 
                   rr.delivery_status, rr.delivery_paid, rr.delivery_cost
            FROM rental_requests rr
            JOIN listings l ON l.id = rr.listing_id
            WHERE rr.delivery_paid = TRUE OR rr.delivery_status IS NOT NULL
        `);
        
        console.log(`📦 Found ${deliveryRequests.rows.length} requests with delivery data:\n`);
        
        deliveryRequests.rows.forEach((req, index) => {
            console.log(`${index + 1}. Request ID: ${req.id}`);
            console.log(`   Listing: ${req.title}`);
            console.log(`   Status: ${req.delivery_status}`);
            console.log(`   Paid: ${req.delivery_paid}`);
            console.log(`   Cost: ₹${req.delivery_cost || 0}\n`);
        });
        
        if (deliveryRequests.rows.length === 0) {
            console.log('✅ No delivery payments found to reset.');
            process.exit(0);
        }
        
        // Delete all delivery events for these requests
        console.log('🗑️  Deleting delivery events...');
        const deleteEventsResult = await db.query(`
            DELETE FROM delivery_events 
            WHERE rental_request_id IN (
                SELECT id FROM rental_requests 
                WHERE delivery_paid = TRUE OR delivery_status IS NOT NULL
            )
        `);
        console.log(`   Deleted ${deleteEventsResult.rowCount} delivery events\n`);
        
        // Delete all delivery ratings for these requests
        console.log('🗑️  Deleting delivery ratings...');
        const deleteRatingsResult = await db.query(`
            DELETE FROM delivery_ratings 
            WHERE request_id IN (
                SELECT id FROM rental_requests 
                WHERE delivery_paid = TRUE OR delivery_status IS NOT NULL
            )
        `);
        console.log(`   Deleted ${deleteRatingsResult.rowCount} delivery ratings\n`);
        
        // Reset rental requests - clear all delivery-related fields
        console.log('🔄 Resetting rental requests to approved status...');
        const resetResult = await db.query(`
            UPDATE rental_requests 
            SET 
                delivery_option = NULL,
                delivery_address = NULL,
                delivery_lat = NULL,
                delivery_lon = NULL,
                delivery_cost = 0,
                distance_km = NULL,
                delivery_paid = FALSE,
                delivery_status = NULL,
                delivery_shipped_at = NULL,
                delivery_en_route_at = NULL,
                delivery_delivered_at = NULL,
                expected_en_route_at = NULL,
                expected_delivered_at = NULL,
                delivery_rated = FALSE,
                return_initiated = FALSE,
                return_option = NULL,
                return_delivery_cost = 0,
                return_delivery_paid = FALSE,
                return_delivery_status = NULL,
                return_shipped_at = NULL,
                return_en_route_at = NULL,
                return_delivered_at = NULL,
                return_confirmed_by_lister = FALSE,
                return_confirmed_by_renter = FALSE,
                pickup_confirmed_by_lister = FALSE,
                pickup_confirmed_by_renter = FALSE
            WHERE delivery_paid = TRUE OR delivery_status IS NOT NULL
            RETURNING id, listing_id
        `);
        
        console.log(`✅ Reset ${resetResult.rowCount} rental requests\n`);
        
        // Show final status
        console.log('📊 Final Status:');
        const finalCheck = await db.query(`
            SELECT rr.id, l.title, rr.status, rr.delivery_paid, rr.delivery_status
            FROM rental_requests rr
            JOIN listings l ON l.id = rr.listing_id
            WHERE rr.id = ANY($1)
        `, [resetResult.rows.map(r => r.id)]);
        
        finalCheck.rows.forEach((req, index) => {
            console.log(`${index + 1}. Request ID: ${req.id} - ${req.title}`);
            console.log(`   Status: ${req.status}`);
            console.log(`   Delivery Paid: ${req.delivery_paid}`);
            console.log(`   Delivery Status: ${req.delivery_status || 'NULL'}\n`);
        });
        
        console.log('✅ All delivery payments have been reset!');
        console.log('💡 You can now re-test the delivery flow with correct timestamps.');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting delivery payments:', error);
        process.exit(1);
    }
}

resetDeliveryPayments();
