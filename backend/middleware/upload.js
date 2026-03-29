const multer = require('multer');

// Store files in memory as buffers before uploading to Cloudinary
const storage = multer.memoryStorage();

// File filter to allow only specific types
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'zipFile') {
    // Only allow ZIP files for the project archive
    if (file.mimetype === 'application/zip' || 
        file.mimetype === 'application/x-zip-compressed' ||
        file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed for project archives!'), false);
    }
  } else if (file.fieldname === 'screenshot') {
    // Only allow common image formats for screenshots
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for screenshots!'), false);
    }
  } else {
    // Default allow for other field types (e.g., resumes)
    cb(null, true);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for ZIPs
  }
});

module.exports = upload;
