const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

class SimpleImageService {
    constructor() {
        this.uploadsDir = path.join(__dirname, '..', 'uploads');
        this.ensureUploadsDirectory();
    }

    ensureUploadsDirectory() {
        // Create uploads directory structure
        const dirs = [
            this.uploadsDir,
            path.join(this.uploadsDir, 'rentals')
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Created directory: ${dir}`);
            }
        });

        console.log('✅ Simple image service initialized');
    }

    async processAndSaveImage(imageBuffer, fileName, userFolder, listingFolder) {
        try {
            // Create user and listing directories
            const userDir = path.join(this.uploadsDir, 'rentals', userFolder);
            const listingDir = path.join(userDir, listingFolder);

            if (!fs.existsSync(userDir)) {
                fs.mkdirSync(userDir, { recursive: true });
            }
            if (!fs.existsSync(listingDir)) {
                fs.mkdirSync(listingDir, { recursive: true });
            }

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

            // Save to file system
            const filePath = path.join(listingDir, fileName);
            fs.writeFileSync(filePath, processedImage);

            // Generate URL (served by Express static middleware)
            const imageUrl = `/uploads/rentals/${userFolder}/${listingFolder}/${fileName}`;
            
            console.log(`📸 Saved image: ${fileName}`);
            return {
                fileName: fileName,
                imageUrl: imageUrl,
                filePath: filePath
            };
        } catch (error) {
            console.error('❌ Error processing and saving image:', error);
            throw error;
        }
    }

    async uploadListingImages(images, userName, userId, listingId) {
        try {
            console.log(`📸 Starting upload of ${images.length} images for listing ${listingId}`);
            console.log(`👤 User: ${userName}(${userId})`);

            const userFolder = `${userName}(${userId})`;
            const listingFolder = `listing_${listingId}`;

            const uploadPromises = images.map(async (image, index) => {
                const fileName = `image${index + 1}.jpg`;
                console.log(`📤 Processing ${fileName} (${(image.buffer.length / 1024 / 1024).toFixed(2)}MB)`);
                return await this.processAndSaveImage(image.buffer, fileName, userFolder, listingFolder);
            });

            const uploadResults = await Promise.all(uploadPromises);
            
            console.log(`✅ Successfully processed ${uploadResults.length} images for listing ${listingId}`);
            return uploadResults.map(result => result.imageUrl);
        } catch (error) {
            console.error('❌ Error uploading listing images:', error);
            throw error;
        }
    }

    async deleteListingImages(userName, userId, listingId) {
        try {
            const userFolder = `${userName}(${userId})`;
            const listingFolder = `listing_${listingId}`;
            const listingDir = path.join(this.uploadsDir, 'rentals', userFolder, listingFolder);

            if (fs.existsSync(listingDir)) {
                // Delete all files in the listing directory
                const files = fs.readdirSync(listingDir);
                files.forEach(file => {
                    fs.unlinkSync(path.join(listingDir, file));
                });
                
                // Remove the directory
                fs.rmdirSync(listingDir);
                console.log(`🗑️ Deleted listing folder: ${listingFolder}`);
            }
        } catch (error) {
            console.error('❌ Error deleting listing images:', error);
            throw error;
        }
    }
}

module.exports = new SimpleImageService();