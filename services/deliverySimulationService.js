const pool = require('../database');

/**
 * Delivery Simulation Service
 * Automatically updates delivery statuses based on expected times
 */

const simulateDeliveryProgress = async () => {
    try {

        // Get all active deliveries
        const activeDeliveries = await pool.query(`
            SELECT rr.id, rr.listing_id,
                   rr.delivery_status, rr.delivery_shipped_at,
                   rr.expected_en_route_at, rr.expected_delivered_at,
                   l.title as listing_title
            FROM rental_requests rr
            JOIN listings l ON l.id = rr.listing_id
            WHERE rr.delivery_paid = TRUE 
            AND rr.delivery_status IN ('shipped', 'en_route')
            AND rr.delivery_shipped_at IS NOT NULL
            AND rr.expected_en_route_at IS NOT NULL
            AND rr.expected_delivered_at IS NOT NULL
        `);

        const now = new Date();
        let updatedCount = 0;

        for (const delivery of activeDeliveries.rows) {
            const expectedEnRoute = new Date(delivery.expected_en_route_at);
            const expectedDelivered = new Date(delivery.expected_delivered_at);

            // Update to "en_route" if it's time
            if (delivery.delivery_status === 'shipped' && now >= expectedEnRoute) {
                await pool.query(`
                    UPDATE rental_requests 
                    SET delivery_status = 'en_route', 
                        delivery_en_route_at = expected_en_route_at
                    WHERE id = $1
                `, [delivery.id]);

                console.log(`✅ Delivery ${delivery.id} (${delivery.listing_title}) → EN_ROUTE`);
                updatedCount++;
            }

            // Update to "delivered" if it's time
            if ((delivery.delivery_status === 'shipped' || delivery.delivery_status === 'en_route') &&
                now >= expectedDelivered) {
                await pool.query(`
                    UPDATE rental_requests 
                    SET delivery_status = 'delivered', 
                        delivery_delivered_at = expected_delivered_at
                    WHERE id = $1
                `, [delivery.id]);

                console.log(`🎉 Delivery ${delivery.id} (${delivery.listing_title}) → DELIVERED`);
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            console.log(`📦 [Cron] Updated ${updatedCount} deliveries`);
        }

    } catch (error) {
        console.error('[Cron] Delivery simulation error:', error);
    }
};

const simulateReturnDeliveryProgress = async () => {
    try {

        // Get all active return deliveries
        const activeReturns = await pool.query(`
            SELECT rr.id, rr.listing_id,
                   rr.return_delivery_status, rr.return_shipped_at,
                   rr.expected_return_en_route_at, rr.expected_return_delivered_at,
                   l.title as listing_title
            FROM rental_requests rr
            JOIN listings l ON l.id = rr.listing_id
            WHERE rr.return_delivery_paid = TRUE 
            AND rr.return_delivery_status IN ('shipped', 'in_transit')
            AND rr.return_shipped_at IS NOT NULL
            AND rr.expected_return_en_route_at IS NOT NULL
            AND rr.expected_return_delivered_at IS NOT NULL
        `);

        const now = new Date();
        let updatedCount = 0;

        for (const returnDelivery of activeReturns.rows) {
            const expectedEnRoute = new Date(returnDelivery.expected_return_en_route_at);
            const expectedDelivered = new Date(returnDelivery.expected_return_delivered_at);

            // Update to "in_transit" if it's time
            if (returnDelivery.return_delivery_status === 'shipped' && now >= expectedEnRoute) {
                await pool.query(`
                    UPDATE rental_requests 
                    SET return_delivery_status = 'in_transit', 
                        return_en_route_at = expected_return_en_route_at
                    WHERE id = $1
                `, [returnDelivery.id]);

                console.log(`✅ Return ${returnDelivery.id} (${returnDelivery.listing_title}) → IN_TRANSIT`);
                updatedCount++;
            }

            // Update to "delivered" if it's time
            if ((returnDelivery.return_delivery_status === 'shipped' || returnDelivery.return_delivery_status === 'in_transit') &&
                now >= expectedDelivered) {
                await pool.query(`
                    UPDATE rental_requests 
                    SET return_delivery_status = 'delivered', 
                        return_delivered_at = expected_return_delivered_at
                    WHERE id = $1
                `, [returnDelivery.id]);

                console.log(`🎉 Return ${returnDelivery.id} (${returnDelivery.listing_title}) → DELIVERED`);
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            console.log(`📦 [Cron] Updated ${updatedCount} return deliveries`);
        }

    } catch (error) {
        console.error('[Cron] Return delivery simulation error:', error);
    }
};

// Run both simulations
const runAllSimulations = async () => {
    await simulateDeliveryProgress();
    await simulateReturnDeliveryProgress();
};

// Start the cron job - runs every minute
const startDeliverySimulationCron = () => {
    console.log('🚀 Starting delivery simulation cron job (runs every minute)');

    // Run immediately on start
    runAllSimulations();

    // Then run every minute
    setInterval(runAllSimulations, 60 * 1000);
};

module.exports = {
    startDeliverySimulationCron,
    simulateDeliveryProgress,
    simulateReturnDeliveryProgress
};