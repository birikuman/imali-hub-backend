import multer from 'multer';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  logger.info(`Created upload directory: ${UPLOAD_DIR}`);
}

// Storage engine config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique name: <timestamp>-<random>-<originalName>
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${cleanedName}`);
  }
});

// File filter (Only PDF, PNG, JPG, JPEG)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Invalid file type. Only PDF, PNG, JPG, and JPEG documents are permitted.'));
  }

  const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/pjpeg'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid MIME type. Upload rejected.'));
  }

  cb(null, true);
};

// Limit file size (Default: 5MB)
const limits = {
  fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '5') * 1024 * 1024
};

export const upload = multer({
  storage,
  fileFilter,
  limits
});

export default upload;
