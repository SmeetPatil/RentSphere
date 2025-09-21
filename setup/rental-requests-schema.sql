-- Rental requests table for managing rental inquiries
CREATE TABLE IF NOT EXISTS rental_requests (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    renter_user_id INTEGER NOT NULL,
    renter_user_type VARCHAR(10) NOT NULL CHECK (renter_user_type IN ('google', 'phone')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    message TEXT, -- Message from renter to lister
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled', 'paid')),
    denial_reason TEXT, -- Reason for denial if status is 'denied'
    
    -- Payment-related columns
    payment_status VARCHAR(20) DEFAULT NULL CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(20) DEFAULT NULL CHECK (payment_method IN ('card', 'upi', 'cash')),
    transaction_id VARCHAR(100) DEFAULT NULL,
    payment_date TIMESTAMP DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure end date is after start date
    CONSTRAINT check_dates CHECK (end_date >= start_date),
    
    -- Prevent duplicate pending requests for same listing by same user
    CONSTRAINT unique_pending_request UNIQUE(listing_id, renter_user_id, renter_user_type, status)
);

-- Add rental status to listings table if not exists
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS rental_status VARCHAR(20) DEFAULT 'available' 
CHECK (rental_status IN ('available', 'rented', 'inactive'));

-- Add current rental info to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS current_renter_id INTEGER,
ADD COLUMN IF NOT EXISTS current_renter_type VARCHAR(10) CHECK (current_renter_type IN ('google', 'phone')),
ADD COLUMN IF NOT EXISTS rental_start_date DATE,
ADD COLUMN IF NOT EXISTS rental_end_date DATE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rental_requests_listing ON rental_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_rental_requests_renter ON rental_requests(renter_user_id, renter_user_type);
CREATE INDEX IF NOT EXISTS idx_rental_requests_status ON rental_requests(status);
CREATE INDEX IF NOT EXISTS idx_rental_requests_payment_status ON rental_requests(payment_status);
CREATE INDEX IF NOT EXISTS idx_listings_rental_status ON listings(rental_status);

-- Function to automatically update listing status when rental is approved
CREATE OR REPLACE FUNCTION update_listing_status_on_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- If a rental request is approved
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        -- Update the listing to rented status
        UPDATE listings 
        SET 
            rental_status = 'rented',
            current_renter_id = NEW.renter_user_id,
            current_renter_type = NEW.renter_user_type,
            rental_start_date = NEW.start_date,
            rental_end_date = NEW.end_date,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.listing_id;
        
        -- Deny all other pending requests for this listing
        UPDATE rental_requests 
        SET status = 'denied', updated_at = CURRENT_TIMESTAMP
        WHERE listing_id = NEW.listing_id 
        AND id != NEW.id 
        AND status = 'pending';
    END IF;
    
    -- If a rental request is paid, keep the listing as rented but update payment info
    IF NEW.status = 'paid' AND OLD.status = 'approved' THEN
        -- Listing should already be in rented status, just ensure consistency
        UPDATE listings 
        SET 
            rental_status = 'rented',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.listing_id;
    END IF;
    
    -- If a rental request is denied or cancelled, check if listing should be available again
    IF NEW.status IN ('denied', 'cancelled') AND OLD.status IN ('approved', 'paid') THEN
        UPDATE listings 
        SET 
            rental_status = 'available',
            current_renter_id = NULL,
            current_renter_type = NULL,
            rental_start_date = NULL,
            rental_end_date = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.listing_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_listing_status ON rental_requests;
CREATE TRIGGER trigger_update_listing_status
    AFTER UPDATE ON rental_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_listing_status_on_approval();