-- KYC Verification Schema for DigiLocker Integration

-- Add KYC columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS kyc_document_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS kyc_document_number VARCHAR(255),
ADD COLUMN IF NOT EXISTS kyc_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS kyc_dob DATE,
ADD COLUMN IF NOT EXISTS kyc_address TEXT;

-- Add KYC columns to phone_users table
ALTER TABLE phone_users 
ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS kyc_document_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS kyc_document_number VARCHAR(255),
ADD COLUMN IF NOT EXISTS kyc_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS kyc_dob DATE,
ADD COLUMN IF NOT EXISTS kyc_address TEXT;

-- Create KYC verification logs table
CREATE TABLE IF NOT EXISTS kyc_verification_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('google', 'phone')),
    verification_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    document_type VARCHAR(100),
    document_number VARCHAR(255),
    verification_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for KYC tables
CREATE INDEX IF NOT EXISTS idx_users_kyc_verified ON users(kyc_verified);
CREATE INDEX IF NOT EXISTS idx_phone_users_kyc_verified ON phone_users(kyc_verified);
CREATE INDEX IF NOT EXISTS idx_kyc_logs_user ON kyc_verification_logs(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_kyc_logs_status ON kyc_verification_logs(status);

-- Comments
COMMENT ON COLUMN users.kyc_status IS 'KYC verification status: pending, in_progress, verified, rejected';
COMMENT ON COLUMN phone_users.kyc_status IS 'KYC verification status: pending, in_progress, verified, rejected';
COMMENT ON TABLE kyc_verification_logs IS 'Logs all KYC verification attempts and results';
