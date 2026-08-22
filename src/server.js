import './setupEnv.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Logger & DB Config
import logger from './utils/logger.js';
import db from './config/db.js';
import apiRouter from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "https:", "http:"],
      "connect-src": ["'self'", "https://unpkg.com"]
    }
  }
}));

// Configure CORS based on .env
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) 
  : ['http://localhost:5173', 'https://imari.bellbot.store'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Parsing payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Rate Limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again after 15 minutes.' }
});
app.use('/api/', limiter);

// Log incoming requests
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
});

// Mount REST APIs
app.use('/api', apiRouter);

// Serve uploads directory securely (images/PDF previews)
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
// Dynamic runtime environment config for frontend
app.get(['/js/env.js', '/env.js'], (req, res) => {
  const apiUrl = process.env.VITE_API_URL || `http://localhost:${PORT}/api`;
  res.type('application/javascript');
  res.send(`window.VITE_API_URL = "${apiUrl}";\nwindow.API_BASE = "${apiUrl}";`);
});

// Serve Frontend Static SPA files (Only in production)
if (process.env.NODE_ENV === 'production') {
  const frontendDir = path.resolve(path.join(__dirname, '../../frontend/public'));
  if (fs.existsSync(frontendDir)) {
    app.use(express.static(frontendDir));
    
    // Fallback for single page routing
    app.get('*', (req, res) => {
      // Only redirect if not looking for API
      if (!req.originalUrl.startsWith('/api')) {
        res.sendFile(path.join(frontendDir, 'index.html'));
      } else {
        res.status(404).json({ success: false, message: 'API Endpoint not found.' });
      }
    });
  } else {
    logger.warn(`Frontend directory not found at: ${frontendDir}. Serve client from directory structure.`);
  }
} else {
  // Simple stub response in development mode
  app.get('/', (req, res) => {
    res.send('Imali Hub API Server active (Development Mode). Please run the frontend separately on port 5173.');
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(`Express error handler: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.'
  });
});

app.listen(PORT, () => {
  logger.success(`====================================================`);
  logger.success(`Imali Hub FinTech Server running on port ${PORT}`);
  logger.success(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.success(`Database Fallback Enabled: ${db.isFallback()}`);
  logger.success(`Local Sandbox: http://localhost:${PORT}`);
  logger.success(`====================================================`);
});

export default app;
