/**
 * Middleware to check if user has completed KYC verification
 * Required for creating listings and rental requests
 */

const digilockerService = require('../services/digilockerService');

const requireKYC = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        kycRequired: true
      });
    }

    const userId = req.user.id;
    const userType = req.user.google_id ? 'google' : 'phone';

    const kycStatus = await digilockerService.isUserVerified(userId, userType);

    if (!kycStatus.verified) {
      return res.status(403).json({
        success: false,
        message: 'KYC verification required. Please complete your profile verification to continue.',
        kycRequired: true,
        kycStatus: kycStatus.status
      });
    }

    // User is KYC verified, proceed
    next();
  } catch (error) {
    console.error('KYC check middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify KYC status'
    });
  }
};

module.exports = { requireKYC };
