const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

class GoogleDriveService {
    constructor() {
        this.drive = null;
        this.parentFolderId = null;
        this.oauth2Client = null;
        this.initializeDrive();
    }

    async initializeDrive() {
        try {
            console.log('🔧 Initializing Google Drive with OAuth...');

            // Check for OAuth credentials
            if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
                console.error('❌ Missing OAuth credentials. Need: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN');
                return;
            }

            // Create OAuth2 client
            this.oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                'http://localhost:3000/oauth/callback' // Redirect URI (not used in server)
            );

            // Set refresh token
            this.oauth2Client.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN
            });

            this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
            console.log('✅ Google Drive OAuth client created');

            // Create or find the main 'rentals' folder
            await this.ensureRentalsFolder();

            console.log('✅ Google Drive service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Google Drive service:', error);
            this.drive = null;
            this.parentFolderId = null;
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
                console.log('✅ Using your personal Google Drive for image storage');
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

            // Convert Buffer to Stream for Google Drive API
            const { Readable } = require('stream');
            const imageStream = new Readable();
            imageStream.push(processedImage);
            imageStream.push(null); // End the stream

            // Upload to Google Drive
            const response = await this.drive.files.create({
                requestBody: {
                    name: fileName,
                    parents: [listingFolderId]
                },
                media: {
                    mimeType: 'image/jpeg',
                    body: imageStream
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
                const error = new Error('Google Drive service not initialized. Please check OAuth credentials.');
                console.error('❌', error.message);
                throw error;
            }

            if (!this.parentFolderId) {
                const error = new Error('Google Drive rentals folder not found. Service initialization may have failed.');
                console.error('❌', error.message);
                throw error;
            }

            console.log(`📸 Starting upload of ${images.length} images for listing ${listingId}`);
            console.log(`👤 User: ${userName}(${userId})`);

            // Create folder structure
            const userFolderId = await this.createUserFolder(userName, userId);
            const listingFolderId = await this.createListingFolder(userFolderId, listingId);

            const uploadPromises = images.map(async (image, index) => {
                const fileName = `image${index + 1}.jpg`;
                console.log(`📤 Uploading ${fileName} (${(image.buffer.length / 1024 / 1024).toFixed(2)}MB)`);
                return await this.processAndUploadImage(image.buffer, fileName, listingFolderId);
            });

            const uploadResults = await Promise.all(uploadPromises);

            console.log(`✅ Successfully uploaded ${uploadResults.length} images for listing ${listingId}`);
            return uploadResults.map(result => result.imageUrl);
        } catch (error) {
            console.error('❌ Error uploading listing images:', error);
            console.error('Error details:', {
                message: error.message,
                driveInitialized: !!this.drive,
                parentFolderId: this.parentFolderId
            });
            throw error;
        }
    }

    async deleteListingImages(userName, userId, listingId) {
        try {
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

    async verifyConfiguration() {
        try {
            // Check environment variables
            const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'];
            const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

            if (missingVars.length > 0) {
                return {
                    success: false,
                    error: 'Missing environment variables',
                    missingVars: missingVars,
                    message: `Please set: ${missingVars.join(', ')}`
                };
            }

            // Check service initialization
            if (!this.drive) {
                return {
                    success: false,
                    error: 'Google Drive service not initialized',
                    message: 'OAuth client creation failed'
                };
            }

            if (!this.parentFolderId) {
                return {
                    success: false,
                    error: 'Rentals folder not found',
                    message: 'Failed to create or find main rentals folder'
                };
            }

            // Test API connectivity
            await this.drive.files.list({
                q: "trashed=false",
                fields: 'files(id, name)',
                pageSize: 1
            });

            return {
                success: true,
                message: 'Google Drive service is properly configured and connected',
                parentFolderId: this.parentFolderId
            };
        } catch (error) {
            return {
                success: false,
                error: 'API connectivity test failed',
                message: error.message,
                details: error.toString()
            };
        }
    }
}

module.exports = new GoogleDriveService();