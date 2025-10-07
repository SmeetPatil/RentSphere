-- Delivery Rating System Database Schema
-- Run this to add delivery rating functionality

-- Add delivery_rated column to rental_requests if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'rental_requests' 
                   AND column_name = 'delivery_rated') THEN
        ALTER TABLE rental_requests ADD COLUMN delivery_rated BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create delivery_ratings table if it doesn't exist
CREATE TABLE IF NOT EXISTS delivery_ratings (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES rental_requests(id) ON DELETE CASCADE,
    rater_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rater_type VARCHAR(10) NOT NULL CHECK (rater_type IN ('lister', 'renter')),
    delivery_rating INTEGER NOT NULL CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    item_condition_rating INTEGER NOT NULL CHECK (item_condition_rating >= 1 AND item_condition_rating <= 5),
    communication_rating INTEGER NOT NULL CHECK (communication_rating >= 1 AND communication_rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one rating per request per rater type
    UNIQUE(request_id, rater_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_request_id ON delivery_ratings(request_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_rater_id ON delivery_ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_rater_type ON delivery_ratings(rater_type);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_delivery_ratings_updated_at ON delivery_ratings;
CREATE TRIGGER update_delivery_ratings_updated_at
    BEFORE UPDATE ON delivery_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON delivery_ratings TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE delivery_ratings_id_seq TO your_app_user;

COMMIT;