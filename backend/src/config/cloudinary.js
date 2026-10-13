const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Uploads a file to Cloudinary if credentials are configured,
 * otherwise returns null so the caller can fall back to local URL.
 */
async function uploadToCloudinary(filePath, folder = 'novaboard/avatars') {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return null;
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' }
      ]
    });
    return result.secure_url;
  } catch (err) {
    console.error('Cloudinary upload error:', err.message);
    return null;
  }
}

module.exports = {
  cloudinary,
  uploadToCloudinary,
};
