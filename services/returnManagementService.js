const pool = require('../database');

/**
 * Service to manage return deadlines and late fees
 * 
 * Return Rules:
 * - Return must be initiated within 36 hours of end_date
 * - Late fees apply after 36 hours:
 *   - First 12 hours after 36h (36-48h): Half daily rate
 *   - After 48 hours: Full daily rate per day
 */

const RETURN_WINDOW_HOURS = 36;
const GRACE_PERIOD_HOURS = 12; // Half-day grace period

/**
 * Calculate late fee based on how late the return is
 */
const calculateLateFee = (endDate, returnInitiatedAt, dailyRate) => {
    const endDateTime = new Date(endDate);
    const returnDateTime = new Date(returnInitiatedAt);

    // Ensure dailyRate is a number
    const rate = parseFloat(dailyRate) || 0;

    // Calculate hours past end date
    const hoursPastEnd = (returnDateTime - endDateTime) / (1000 * 60 * 60);

    // If within 36-hour window, no late fee
    if (hoursPastEnd <= RETURN_WINDOW_HOURS) {
        return {
            lateFee: 0,
            hoursLate: 0,
            daysLate: 0,
            isLate: false
        };
    }

    // Calculate hours past the 36-hour window
    const hoursLate = hoursPastEnd - RETURN_WINDOW_HOURS;

    let lateFee = 0;
    let daysLate = 0;

    // First 12 hours after 36h window (36-48h total): Half daily rate
    if (hoursLate <= GRACE_PERIOD_HOURS) {
        lateFee = rate * 0.5;
        daysLate = 0.5;
    } else {
        // After 48 hours: Half day + full days
        const fullDaysLate = Math.floor((hoursLate - GRACE_PERIOD_HOURS) / 24);
        const remainingHours = (hoursLate - GRACE_PERIOD_HOURS) % 24;

        // Half day for first 12 hours
        lateFee = rate * 0.5;
        daysLate = 0.5;

        // Full days
        lateFee += fullDaysLate * rate;
        daysLate += fullDaysLate;

        // Partial day (if any remaining hours, charge full day)
        if (remainingHours > 0) {
            lateFee += rate;
            daysLate += 1;
        }
    }

    // Ensure all values are valid numbers before calling toFixed
    console.log('Before toFixed - lateFee:', lateFee, 'type:', typeof lateFee, 'isNaN:', isNaN(lateFee));
    console.log('Before toFixed - hoursLate:', hoursLate, 'type:', typeof hoursLate, 'isNaN:', isNaN(hoursLate));
    console.log('Before toFixed - daysLate:', daysLate, 'type:', typeof daysLate, 'isNaN:', isNaN(daysLate));

    const safeFee = (typeof lateFee === 'number' && !isNaN(lateFee)) ? lateFee : 0;
    const safeHours = (typeof hoursLate === 'number' && !isNaN(hoursLate)) ? hoursLate : 0;
    const safeDays = (typeof daysLate === 'number' && !isNaN(daysLate)) ? daysLate : 0;

    return {
        lateFee: parseFloat(safeFee.toFixed(2)),
        hoursLate: parseFloat(safeHours.toFixed(2)),
        daysLate: parseFloat(safeDays.toFixed(2)),
        isLate: true
    };
};

/**
 * Check if return window is still open
 */
const isReturnWindowOpen = (endDate) => {
    const endDateTime = new Date(endDate);
    const now = new Date();
    const hoursPastEnd = (now - endDateTime) / (1000 * 60 * 60);

    return hoursPastEnd <= RETURN_WINDOW_HOURS;
};

/**
 * Get time remaining in return window
 */
const getReturnWindowRemaining = (endDate) => {
    const endDateTime = new Date(endDate);
    const now = new Date();
    const hoursPastEnd = (now - endDateTime) / (1000 * 60 * 60);

    if (hoursPastEnd < 0) {
        return {
            status: 'not_started',
            message: 'Rental period not ended yet',
            hoursRemaining: null
        };
    }

    const hoursRemaining = RETURN_WINDOW_HOURS - hoursPastEnd;

    if (hoursRemaining > 0) {
        return {
            status: 'open',
            message: `${Math.floor(hoursRemaining)} hours remaining to initiate return`,
            hoursRemaining: parseFloat(hoursRemaining.toFixed(2))
        };
    }

    return {
        status: 'overdue',
        message: 'Return window expired - late fees apply',
        hoursRemaining: 0,
        hoursOverdue: parseFloat(Math.abs(hoursRemaining).toFixed(2))
    };
};

/**
 * Background service to check and flag overdue returns
 */
const checkOverdueReturns = async () => {
    try {
        console.log('[Return Management] Checking for overdue returns...');

        const now = new Date();

        // Get all paid requests where rental period has ended but return not initiated
        const query = `
            SELECT rr.*, l.price_per_day, l.title as listing_title
            FROM rental_requests rr
            JOIN listings l ON rr.listing_id = l.id
            WHERE rr.status = 'paid' 
            AND rr.end_date < $1
            AND rr.return_initiated = FALSE
            AND rr.delivery_confirmed = TRUE
        `;

        const result = await pool.query(query, [now]);
        const overdueRequests = result.rows;

        let flaggedCount = 0;

        for (const request of overdueRequests) {
            const windowStatus = getReturnWindowRemaining(request.end_date);

            if (windowStatus.status === 'overdue') {
                // Calculate current late fee
                const lateInfo = calculateLateFee(request.end_date, now, request.price_per_day);

                console.log(`[Return Management] Request #${request.id} is overdue by ${lateInfo.hoursLate}h - Late fee: ₹${lateInfo.lateFee}`);

                // Update request with overdue flag and current late fee
                await pool.query(`
                    UPDATE rental_requests 
                    SET return_overdue = TRUE,
                        current_late_fee = $1,
                        late_fee_days = $2
                    WHERE id = $3
                `, [lateInfo.lateFee, lateInfo.daysLate, request.id]);

                flaggedCount++;
            }
        }

        if (flaggedCount > 0) {
            console.log(`[Return Management] Flagged ${flaggedCount} overdue return(s)`);
        } else {
            console.log('[Return Management] No overdue returns found');
        }

    } catch (error) {
        console.error('[Return Management] Error checking overdue returns:', error);
    }
};

/**
 * Start the return management service
 */
const startReturnManagementService = () => {
    console.log('[Return Management] Starting service...');

    // Run immediately on start
    checkOverdueReturns();

    // Then run every 10 minutes
    setInterval(checkOverdueReturns, 10 * 60 * 1000);
};

module.exports = {
    calculateLateFee,
    isReturnWindowOpen,
    getReturnWindowRemaining,
    checkOverdueReturns,
    startReturnManagementService,
    RETURN_WINDOW_HOURS,
    GRACE_PERIOD_HOURS
};
