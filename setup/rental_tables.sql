-- Rental listings table
CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('google', 'phone')),
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price_per_day DECIMAL(10,2) NOT NULL,
    images TEXT[], -- Array of image URLs
    specifications JSONB, -- Product specs from AI
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User ratings table
CREATE TABLE IF NOT EXISTS user_ratings (
    id SERIAL PRIMARY KEY,
    rated_user_id INTEGER NOT NULL,
    rated_user_type VARCHAR(10) NOT NULL CHECK (rated_user_type IN ('google', 'phone')),
    rater_user_id INTEGER NOT NULL,
    rater_user_type VARCHAR(10) NOT NULL CHECK (rater_user_type IN ('google', 'phone')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    listing_id INTEGER REFERENCES listings(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_listings_lat_lng ON listings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_available ON listings(is_available);
CREATE INDEX IF NOT EXISTS idx_user_ratings_user ON user_ratings(rated_user_id, rated_user_type);