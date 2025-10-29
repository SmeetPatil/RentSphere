/**
 * Mock KYC Service
 * Simulates KYC verification without real DigiLocker integration
 */

class MockKYCService {
  /**
   * Generate mock authorization URL
   */
  getAuthorizationUrl(userId, userType) {
    return `/api/kyc/mock-auth?userId=${userId}&userType=${userType}`;
  }

  /**
   * Verify KYC data and save to database
   */
  async verifyAndSaveKYC(userId, userType, kycData) {
    const pool = require('../database');
    
    try {
      // Format address
      const address = kycData.address ? 
        kycData.address.full || 
        `${kycData.address.house || ''} ${kycData.address.street || ''}, ${kycData.address.locality || ''}, ${kycData.address.vtc || ''}, ${kycData.address.district || ''}, ${kycData.address.state || ''} - ${kycData.address.pincode || ''}`.trim() :
        '';

      const table = userType === 'google' ? 'users' : 'phone_users';
      
      // Update user KYC status
      const updateQuery = `
        UPDATE ${table}
        SET 
          kyc_verified = true,
          kyc_status = 'verified',
          kyc_verified_at = CURRENT_TIMESTAMP,
          kyc_document_type = 'aadhaar',
          kyc_document_number = $1,
          kyc_name = $2,
          kyc_dob = $3,
          kyc_address = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [
        kycData.uid,
        kycData.name,
        kycData.dob,
        address,
        userId
      ]);

      // Log verification
      await pool.query(`
        INSERT INTO kyc_verification_logs 
        (user_id, user_type, verification_method, status, document_type, document_number, verification_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        userType,
        'mock_digilocker',
        'verified',
        'aadhaar',
        kycData.uid,
        JSON.stringify(kycData)
      ]);

      return {
        success: true,
        user: result.rows[0]
      };
    } catch (error) {
      console.error('KYC save error:', error);
      throw new Error('Failed to save KYC data');
    }
  }

  /**
   * Check if user is KYC verified
   */
  async isUserVerified(userId, userType) {
    const pool = require('../database');
    const table = userType === 'google' ? 'users' : 'phone_users';
    
    try {
      const result = await pool.query(
        `SELECT kyc_verified, kyc_status FROM ${table} WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return { verified: false, status: 'pending' };
      }

      return {
        verified: result.rows[0].kyc_verified || false,
        status: result.rows[0].kyc_status || 'pending'
      };
    } catch (error) {
      console.error('KYC check error:', error);
      return { verified: false, status: 'error' };
    }
  }

  /**
   * Get KYC details for a user
   */
  async getKYCDetails(userId, userType) {
    const pool = require('../database');
    const table = userType === 'google' ? 'users' : 'phone_users';
    
    try {
      const result = await pool.query(
        `SELECT 
          kyc_verified, 
          kyc_status, 
          kyc_verified_at, 
          kyc_document_type,
          kyc_name,
          kyc_dob
        FROM ${table} WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('KYC details fetch error:', error);
      return null;
    }
  }
}

module.exports = new MockKYCService();
