const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

class GoogleDriveService {
    constructor() {
        this.drive = null;
        this.parentFolderId = null; // Will store the main 'rentals' folder ID
        this.initializeDrive();
    }

    async initializeDrive() {
        try {
            let auth;

            // Check if we have credentials in environment variable (for Render deployment)
            if (process.env.GOOGLE_DRIVE_CREDENTIALS) {
                // Create credentials file from environment variable
                const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
                const credentialsPath = path.join(__dirname, '..', 'google-drive-credentials.json');
                
                // Write credentials to file if it doesn't exist
                if (!fs.existsSync(credentialsPath)) {
                    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
                    console.log('📝 Created credentials file from environment variable');
                }

                auth = new google.auth.GoogleAuth({
                    keyFile: credentialsPath,
                    scopes: ['https://www.googleapis.com/auth/drive']
                });
            } else if (process.env.GOOGLE_DRIVE_KEY_FILE) {
                // Use local credentials file
                auth = new google.auth.GoogleAuth({
                    keyFile: process.env.GOOGLE_DRIVE_KEY_FILE,
                    scopes: ['https://www.googleapis.com/auth/drive']
                });
            } else {
                throw new Error('Google Drive credentials not configured. Please set GOOGLE_DRIVE_KEY_FILE or GOOGLE_DRIVE_CREDENTIALS environment variable.');
            }

            this.drive = google.drive({ version: 'v3', auth });
            
            // Create or find the main 'rentals' folder
            await this.ensureRentalsFolder();
            
            console.log('✅ Google Drive service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Google Drive service:', error);
            console.error('Please check GOOGLE_DRIVE_SETUP.md for setup instructions');
        }
    }

    async ensureRentalsFolder() {
        try {
            // Check if 'rentals' folder exists
            const response = await this.drive.files.list({
                q: "name='rentals' and mimeType='application/vnd.google-apps.folder' and trashed=false",
                fields: 'files(id, name)'
            });

            if (response.data.files.length > 0) {
                this.parentFolderId = response.data.files[0].id;
                console.log('📁 Found existing rentals folder:', this.parentFolderId);
            } else {
                // Create the rentals folder
                const folderResponse = await this.drive.files.create({
                    requestBody: {
                        name: 'rentals',
                        mimeType: 'application/vnd.google-apps.folder'
                    },
                    fields: 'id'
                });
                
                this.parentFolderId = folderResponse.data.id;
                console.log('📁 Created new rentals folder:', this.parentFolderId);
            }
        } catch (error) {
            console.error('❌ Error managing rentals folder:', error);
            throw error;
        }
    }

    async createUserFolder(userName, userId) {
        try {
            const folderName = `${userName}(${userId})`;
            
            // Check if user folder exists
            const response = await this.drive.files.list({
                q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and parents in '${this.parentFolderId}' and trashed=false`,
                fields: 'files(id, name)'
            });

            if (response.data.files.length > 0) {
                return response.data.files[0].id;
            }

            // Create user folder
            const folderResponse = await this.drive.files.create({
                requestBody: {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [this.parentFolderId]
                },
                fields: 'id'
            });

            console.log(`📁 Created user folder: ${folderName}`);
            return folderResponse.data.id;
        } catch (error) {
            console.error('❌ Error creating user folder:', error);
            throw error;
        }
    }

    async createListingFolder(userFolderId, listingId) {
        try {
            const folderName = `listing_${listingId}`;
            
            // Check if listing folder exists
            const response = await this.drive.files.list({
                q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and parents in '${userFolderId}' and trashed=false`,
                fields: 'files(id, name)'
            });

            if (response.data.files.length > 0) {
                return response.data.files[0].id;
            }

            // Create listing folder
            const folderResponse = await this.drive.files.create({
                requestBody: {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [userFolderId]
                },
                fields: 'id'
            });

            console.log(`📁 Created listing folder: ${folderName}`);
            return folderResponse.data.id;
        } catch (error) {
            console.error('❌ Error creating listing folder:', error);
            throw error;
        }
    }

    async processAndUploadImage(imageBuffer, fileName, listingFolderId) {
        try {
            // Process image with Sharp (compress and resize)
            const processedImage = await sharp(imageBuffer)
                .resize(1200, 800, { 
                    fit: 'inside', 
                    withoutEnlargement: true 
                })
                .jpeg({ 
                    quality: 85,
                    progressive: true 
                })
                .toBuffer();

            // Upload to Google Drive
            const response = await this.drive.files.create({
                requestBody: {
                    name: fileName,
                    parents: [listingFolderId]
                },
                media: {
                    mimeType: 'image/jpeg',
                    body: processedImage
                },
                fields: 'id, webViewLink, webContentLink'
            });

            // Make the file publicly viewable
            await this.drive.permissions.create({
                fileId: response.data.id,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                }
            });

            // Generate direct image URL
            const imageUrl = `https://drive.google.com/uc?export=view&id=${response.data.id}`;
            
            console.log(`📸 Uploaded image: ${fileName}`);
            return {
                fileId: response.data.id,
                imageUrl: imageUrl,
                fileName: fileName
            };
        } catch (error) {
            console.error('❌ Error uploading image:', error);
            throw error;
        }
    }

    async uploadListingImages(images, userName, userId, listingId) {
        try {
            if (!this.drive) {
                throw new Error('Google Drive service not initialized');
            }

            // Create folder structure
            const userFolderId = await this.createUserFolder(userName, userId);
            const listingFolderId = await this.createListingFolder(userFolderId, listingId);

            const uploadPromises = images.map(async (image, index) => {
                const fileName = `image${index + 1}.jpg`;
                return await this.processAndUploadImage(image.buffer, fileName, listingFolderId);
            });

            const uploadResults = await Promise.all(uploadPromises);
            
            console.log(`✅ Successfully uploaded ${uploadResults.length} images for listing ${listingId}`);
            return uploadResults.map(result => result.imageUrl);
        } catch (error) {
            console.error('❌ Error uploading listing images:', error);
            throw error;
        }
    }

    async deleteListingImages(userName, userId, listingId) {
        try {
            const folderName = `${userName}(${userId})`;
            const listingFolderName = `listing_${listingId}`;
            
            // Find and delete the listing folder and all its contents
            const response = await this.drive.files.list({
                q: `name='${listingFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)'
            });

            if (response.data.files.length > 0) {
                const folderId = response.data.files[0].id;
                await this.drive.files.delete({ fileId: folderId });
                console.log(`🗑️ Deleted listing folder: ${listingFolderName}`);
            }
        } catch (error) {
            console.error('❌ Error deleting listing images:', error);
            throw error;
        }
    }
}

module.exports = new GoogleDriveService();