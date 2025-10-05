# Google Drive OAuth Setup Instructions

## Problem
Your Google OAuth refresh token has expired or been revoked. This prevents the application from uploading images to Google Drive.

## Quick Fix

### Step 1: Run the Token Refresh Script
```bash
node setup/get-refresh-token.js
```

### Step 2: Follow the Instructions
1. The script will display a URL - visit it in your browser
2. Sign in to your Google account 
3. Grant permissions for Google Drive access
4. Copy the authorization code from the redirected URL
5. Paste it into the terminal when prompted

### Step 3: Update Your .env File
The script will provide you with a new `GOOGLE_REFRESH_TOKEN`. 

Add or update this line in your `.env` file:
```
GOOGLE_REFRESH_TOKEN=your_new_refresh_token_here
```

### Step 4: Restart Your Server
After updating the `.env` file, restart your Node.js server:
```bash
# Press Ctrl+C to stop the server, then:
npm start
# or
node server.js
```

## What This Fixes
- Google Drive image uploads will work again
- New rental listings can have images uploaded
- The "invalid_grant" error will be resolved

## Alternative Solution
If you continue having issues, you may need to:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to your project's OAuth 2.0 credentials
3. Reset or regenerate your OAuth credentials
4. Update your `.env` file with the new `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
5. Run the token refresh script again

## Need Help?
The application will continue to work without Google Drive integration, but images won't be uploaded. The error handling has been improved to gracefully handle OAuth issues.