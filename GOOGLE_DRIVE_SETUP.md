# Google Drive OAuth Setup Guide

## ✅ **SETUP COMPLETE**

This RentSphere deployment uses **OAuth2 authentication** to upload images directly to your personal Google Drive with 2TB storage.

## 🔧 Current Configuration

### Production Environment Variables (Render)

```bash
GOOGLE_CLIENT_ID=[Already in .env file]
GOOGLE_CLIENT_SECRET=[Already in .env file]
GOOGLE_REFRESH_TOKEN=[Your refresh token - already configured]
```

### Local Development

Uses the same OAuth credentials from `.env` file.

## 🚀 How It Works

1. **OAuth2 Authentication**: Uses your personal Google account for authentication
2. **Cross-Account Setup**:
   - OAuth app owned by: `smeetpatil878@gmail.com`
   - Storage account: `thunderblack994@gmail.com` (2TB storage)
3. **Automatic Folder Creation**: Creates `/rentals` folder in your Google Drive
4. **Organized Storage**: Images stored as `/rentals/username(id)/listing_id/image1.jpg`

## 📊 Image Storage Details

- **Your Drive**: 2TB available
- **Per Image**: Max 5MB
- **Per Listing**: Max 5 images (25MB total)
- **Compression**: Images auto-compressed to 85% quality
- **Resize**: Auto-resized to max 1200x800px

## 🎉 Ready for Production

**Google Drive integration is complete and ready for deployment! 📸✨**

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
