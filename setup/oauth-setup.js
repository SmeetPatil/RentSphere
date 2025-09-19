const { google } = require('googleapis');
const readline = require('readline');

// OAuth setup for Google Drive
async function setupOAuth() {
    console.log('🔧 Google Drive OAuth Setup');
    console.log('============================\n');

    // You'll need to get these from Google Cloud Console
    const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
    const CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';
    const REDIRECT_URI = 'http://localhost:3000/oauth/callback';

    if (CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID' || CLIENT_SECRET === 'YOUR_GOOGLE_CLIENT_SECRET') {
        console.log('❌ Please update CLIENT_ID and CLIENT_SECRET in this file first!');
        console.log('\n📋 Steps to get OAuth credentials:');
        console.log('1. Go to Google Cloud Console');
        console.log('2. Enable Google Drive API');
        console.log('3. Create OAuth 2.0 credentials');
        console.log('4. Add http://localhost:3000/oauth/callback as redirect URI');
        console.log('5. Update CLIENT_ID and CLIENT_SECRET in this file');
        console.log('6. Run this script again');
        return;
    }

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive']
    });

    console.log('📋 Steps:');
    console.log('1. Open this URL in your browser:');
    console.log(`\n${authUrl}\n`);
    console.log('2. Authorize the application');
    console.log('3. Copy the authorization code from the callback URL');
    console.log('4. Paste it below\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Enter the authorization code: ', async (code) => {
        try {
            const { tokens } = await oauth2Client.getToken(code);
            
            console.log('\n✅ Success! Add these environment variables to Render:');
            console.log('================================================');
            console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
            console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
            console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
            console.log('================================================\n');
            
            console.log('🚀 Your Google Drive integration is ready!');
            console.log('📁 The app will create a "rentals" folder in your Google Drive');
            console.log('📸 All rental images will be stored there with public access');
            
        } catch (error) {
            console.error('❌ Error getting tokens:', error);
        }
        
        rl.close();
    });
}

setupOAuth().catch(console.error);