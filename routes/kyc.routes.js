const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const mockKYCService = require('../services/mockKYCService');

/**
 * Mock KYC Routes - Simulates DigiLocker Integration
 */

// Get KYC status for current user
router.get('/api/kyc/status', isLoggedIn, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.google_id ? 'google' : 'phone';

    const kycStatus = await mockKYCService.isUserVerified(userId, userType);
    const kycDetails = await mockKYCService.getKYCDetails(userId, userType);

    res.json({
      success: true,
      verified: kycStatus.verified,
      status: kycStatus.status,
      details: kycDetails
    });
  } catch (error) {
    console.error('KYC status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check KYC status'
    });
  }
});

// Initiate Mock KYC verification
router.post('/api/kyc/initiate', isLoggedIn, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.google_id ? 'google' : 'phone';

    // Check if already verified
    const kycStatus = await mockKYCService.isUserVerified(userId, userType);
    if (kycStatus.verified) {
      return res.json({
        success: false,
        message: 'User is already KYC verified'
      });
    }

    // Generate mock authorization URL
    const authUrl = mockKYCService.getAuthorizationUrl(userId, userType);

    res.json({
      success: true,
      authUrl: authUrl,
      message: 'Redirect user to mock verification'
    });
  } catch (error) {
    console.error('KYC initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate KYC verification'
    });
  }
});

// Mock KYC authentication page
router.get('/api/kyc/mock-auth', async (req, res) => {
  try {
    const { userId, userType } = req.query;

    if (!userId || !userType) {
      return res.status(400).send('Missing user parameters');
    }

    // Render a simple mock authentication page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DigiLocker - Aadhaar eKYC</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔐</text></svg>">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f7fa;
            min-height: 100vh;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            padding: 1.5rem 2rem;
            border-radius: 10px 10px 0 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header-content {
            max-width: 600px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .logo {
            font-size: 2.5rem;
          }
          .header-text h1 {
            font-size: 1.5rem;
            margin-bottom: 0.25rem;
          }
          .header-text p {
            font-size: 0.9rem;
            opacity: 0.9;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 0 0 10px 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            padding: 2rem;
          }
          .info-banner {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            border-left: 4px solid #3b82f6;
            padding: 1rem;
            margin-bottom: 1.5rem;
            border-radius: 6px;
          }
          .info-banner strong {
            color: #1e40af;
            display: block;
            margin-bottom: 0.5rem;
          }
          .info-banner p {
            color: #1e3a8a;
            font-size: 0.9rem;
            line-height: 1.5;
          }
          .section-title {
            font-size: 1.1rem;
            color: #1e3a8a;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #e5e7eb;
          }
          .form-group {
            margin-bottom: 1.25rem;
          }
          label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #374151;
            font-size: 0.9rem;
          }
          input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e5e7eb;
            border-radius: 6px;
            font-size: 1rem;
            transition: border-color 0.3s;
          }
          input:focus {
            outline: none;
            border-color: #3b82f6;
          }
          input:read-only {
            background: #f9fafb;
            color: #6b7280;
          }
          .consent-box {
            background: #fef3c7;
            border: 2px solid #fbbf24;
            padding: 1rem;
            border-radius: 6px;
            margin: 1.5rem 0;
          }
          .consent-box label {
            display: flex;
            align-items: start;
            gap: 0.75rem;
            font-weight: normal;
            cursor: pointer;
          }
          .consent-box input[type="checkbox"] {
            width: auto;
            margin-top: 0.25rem;
            cursor: pointer;
          }
          button {
            width: 100%;
            padding: 1rem;
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            margin-top: 0.5rem;
          }
          button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          }
          button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .cancel-btn {
            background: #e5e7eb;
            color: #374151;
          }
          .cancel-btn:hover {
            background: #d1d5db;
            box-shadow: none;
          }
          .security-note {
            text-align: center;
            color: #6b7280;
            font-size: 0.85rem;
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e5e7eb;
          }
          .security-note svg {
            display: inline-block;
            vertical-align: middle;
            margin-right: 0.25rem;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-content">
            <div class="logo">🔐</div>
            <div class="header-text">
              <h1>DigiLocker</h1>
              <p>Aadhaar eKYC Verification</p>
            </div>
          </div>
        </div>

        <div class="container">
          <div class="info-banner">
            <strong>📋 Aadhaar Verification</strong>
            <p>Please verify your Aadhaar details to complete KYC verification. Your information is securely encrypted and will only be used for identity verification purposes.</p>
          </div>

          <form id="kycForm">
            <div class="section-title">Personal Information</div>

            <div class="form-group">
              <label>Full Name (as per Aadhaar)</label>
              <input type="text" id="name" placeholder="Enter your full name" required>
            </div>

            <div class="form-group">
              <label>Date of Birth</label>
              <input type="date" id="dob" required>
            </div>

            <div class="form-group">
              <label>Gender</label>
              <select id="gender" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 6px; font-size: 1rem;">
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>

            <div class="section-title" style="margin-top: 2rem;">Address Details</div>

            <div class="form-group">
              <label>House/Building Number</label>
              <input type="text" id="house" placeholder="e.g., 123" required>
            </div>

            <div class="form-group">
              <label>Street/Area</label>
              <input type="text" id="street" placeholder="e.g., MG Road" required>
            </div>

            <div class="form-group">
              <label>City/Town</label>
              <input type="text" id="city" placeholder="e.g., Mumbai" required>
            </div>

            <div class="form-group">
              <label>State</label>
              <input type="text" id="state" placeholder="e.g., Maharashtra" required>
            </div>

            <div class="form-group">
              <label>PIN Code</label>
              <input type="text" id="pincode" placeholder="e.g., 400001" maxlength="6" pattern="[0-9]{6}" required>
            </div>

            <div class="form-group">
              <label>Aadhaar Number (Last 4 digits)</label>
              <input type="text" id="aadhaar" placeholder="XXXX-XXXX-1234" maxlength="4" pattern="[0-9]{4}" required>
            </div>

            <div class="consent-box">
              <label>
                <input type="checkbox" id="consent" required>
                <span>I hereby authorize DigiLocker to fetch my Aadhaar details from UIDAI for the purpose of KYC verification. I understand that my data will be handled securely and used only for verification purposes.</span>
              </label>
            </div>

            <button type="submit" id="submitBtn">🔒 Verify & Proceed</button>
            <button type="button" class="cancel-btn" onclick="window.location.href='/profile'">Cancel</button>

            <div class="security-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Secured by 256-bit SSL encryption
            </div>
          </form>
        </div>

        <script>
          document.getElementById('kycForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Verifying...';
            
            // Simulate API delay for realism
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const house = document.getElementById('house').value;
            const street = document.getElementById('street').value;
            const city = document.getElementById('city').value;
            const state = document.getElementById('state').value;
            const pincode = document.getElementById('pincode').value;
            const aadhaarLast4 = document.getElementById('aadhaar').value;
            
            const fullAddress = house + ' ' + street + ', ' + city + ', ' + state + ' - ' + pincode;
            
            const kycData = {
              userId: '${userId}',
              userType: '${userType}',
              name: document.getElementById('name').value,
              dob: document.getElementById('dob').value,
              gender: document.getElementById('gender').value,
              uid: 'XXXX-XXXX-' + aadhaarLast4,
              address: {
                full: fullAddress,
                house: house,
                street: street,
                locality: city,
                vtc: city,
                district: city,
                state: state,
                pincode: pincode
              }
            };

            try {
              const response = await fetch('/api/kyc/mock-verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(kycData)
              });

              const result = await response.json();
              
              if (result.success) {
                submitBtn.textContent = '✓ Verified Successfully!';
                submitBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                setTimeout(() => {
                  window.location.href = '/profile?kyc=success';
                }, 1000);
              } else {
                submitBtn.disabled = false;
                submitBtn.textContent = '🔒 Verify & Proceed';
                alert('Verification failed: ' + result.message);
              }
            } catch (error) {
              submitBtn.disabled = false;
              submitBtn.textContent = '🔒 Verify & Proceed';
              alert('Error: ' + error.message);
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Mock auth error:', error);
    res.status(500).send('Mock authentication failed');
  }
});

// Mock KYC verification endpoint
router.post('/api/kyc/mock-verify', async (req, res) => {
  try {
    const { userId, userType, name, dob, gender, uid, address } = req.body;

    // Create Aadhaar data structure
    const aadhaarData = {
      name: name,
      dob: dob,
      gender: gender || 'M',
      uid: uid,
      address: address
    };

    // Verify and save KYC data
    await mockKYCService.verifyAndSaveKYC(userId, userType, aadhaarData);

    res.json({
      success: true,
      message: 'KYC verification successful'
    });
  } catch (error) {
    console.error('KYC verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
});

module.exports = router;
