# Google Drive API Setup Guide

## 🚀 Step-by-Step Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Name it "RentSphere Drive Integration"

### 2. Enable Google Drive API

1. In Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on it and press "Enable"

### 3. Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Name: `rentsphere-drive-service`
4. Description: `Service account for RentSphere image uploads`
5. Click "Create and Continue"
6. Skip role assignment for now, click "Continue"
7. Click "Done"

### 4. Generate Service Account Key

1. In "Credentials", find your service account
2. Click on the service account email
3. Go to "Keys" tab
4. Click "Add Key" > "Create New Key"
5. Choose "JSON" format
6. Download the key file
7. **IMPORTANT**: Rename it to `google-drive-credentials.json`
8. Place it in your project root directory

### 5. Share Google Drive Folder

1. Open your Google Drive
2. The app will create a "rentals" folder automatically
3. Once created, right-click the "rentals" folder
4. Click "Share"
5. Add the service account email (from the JSON file)
6. Give it "Editor" permissions
7. Click "Send"

### 6. Environment Variables

Add to your `.env` file:

```bash
# Google Drive Configuration
GOOGLE_DRIVE_KEY_FILE=./google-drive-credentials.json
```

### 7. For Render Deployment

1. **Upload credentials to Render**:

   - In Render dashboard, go to your service
   - Go to "Environment" tab
   - Add environment variable:
     - Key: `GOOGLE_DRIVE_CREDENTIALS`
     - Value: Copy the ENTIRE content of your `google-drive-credentials.json` file

2. **Update environment variables**:

   ```bash
   GOOGLE_DRIVE_KEY_FILE=google-drive-credentials.json
   ```

3. **Create credentials file on server**:
   The app will automatically create the credentials file from the environment variable.

## 🔧 File Structure Created

Your Google Drive will have this structure:

```
📁 rentals/
  📁 john_doe(123)/
    📁 listing_456/
      📸 image1.jpg
      📸 image2.jpg
      📸 image3.jpg
  📁 jane_smith(789)/
    📁 listing_101/
      📸 image1.jpg
```

## ✅ Testing

After setup, test with:

1. Create a new rental listing
2. Upload 1-5 images (max 5MB each)
3. Check your Google Drive for the folder structure
4. Verify images appear on the rental listing

## 🔐 Security Notes

- Service account key file contains sensitive information
- Never commit `google-drive-credentials.json` to git
- Add it to `.gitignore`
- For production, use environment variables only

## 📊 Storage Limits

- **Your Drive**: 2TB available
- **Per Image**: Max 5MB
- **Per Listing**: Max 5 images (25MB total)
- **Compression**: Images auto-compressed to 85% quality
- **Resize**: Auto-resized to max 1200x800px

## 🚨 Troubleshooting

### "Service account not found"

- Check the service account email in credentials file
- Ensure you shared the Drive folder with this email

### "Permission denied"

- Make sure service account has "Editor" access to Drive folder
- Check if Google Drive API is enabled

### "File not found"

- Ensure `google-drive-credentials.json` is in the correct location
- Check the `GOOGLE_DRIVE_KEY_FILE` environment variable path

---

**Ready to upload real rental images! 📸✨**
