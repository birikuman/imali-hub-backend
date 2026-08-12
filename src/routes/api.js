import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

// Controller Imports
import {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  verifyEmail
} from '../controllers/authController.js';

import {
  getLoans,
  getBanks,
  getLoanById,
  createLoan,
  updateLoan,
  deleteLoan
} from '../controllers/loanController.js';

import {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplicationStatus,
  uploadDocument,
  forwardApplication
} from '../controllers/applicationController.js';

import {
  getNotifications,
  markRead,
  markAllRead
} from '../controllers/notificationController.js';

import {
  getUsers,
  updateUserStatus,
  createBank,
  updateBank,
  deleteBank,
  getAuditLogs,
  getDashboardAnalytics
} from '../controllers/adminController.js';

import {
  simulateUSSD,
  simulateMoMoWebhook,
  verifyNationalID,
  getCreditScore,
  getAIRecommendations
} from '../controllers/futureController.js';

const router = Router();

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/reset-request', requestPasswordReset);
router.post('/auth/reset', resetPassword);
router.post('/auth/verify', verifyEmail);

// ==========================================
// 2. LOANS & DIRECTORIES
// ==========================================
router.get('/loans', getLoans);
router.get('/loans/banks', getBanks);
router.get('/loans/:id', getLoanById);

// Admin/Officer Management
router.post('/loans', authenticateToken, requireRole(['admin', 'bank_officer']), createLoan);
router.put('/loans/:id', authenticateToken, requireRole(['admin', 'bank_officer']), updateLoan);
router.delete('/loans/:id', authenticateToken, requireRole(['admin', 'bank_officer']), deleteLoan);

// ==========================================
// 3. APPLICATIONS & DOCUMENTS
// ==========================================
router.post('/applications', authenticateToken, requireRole(['citizen']), createApplication);
router.get('/applications', authenticateToken, getApplications);
router.get('/applications/:id', authenticateToken, getApplicationById);

// Status progress
router.put('/applications/:id/status', authenticateToken, requireRole(['admin', 'bank_officer', 'head_officer', 'credit_manager', 'analyst']), updateApplicationStatus);
router.put('/applications/:id/forward', authenticateToken, requireRole(['admin', 'bank_officer', 'relationship_manager', 'credit_manager', 'head_officer', 'analyst']), forwardApplication);

// File uploads
router.post('/applications/document', authenticateToken, upload.single('document'), uploadDocument);

// ==========================================
// 4. NOTIFICATIONS FEED
// ==========================================
router.get('/notifications', authenticateToken, getNotifications);
router.put('/notifications/read-all', authenticateToken, markAllRead);
router.put('/notifications/:id/read', authenticateToken, markRead);

// ==========================================
// 5. ADMIN CONTROL CONSOLE & ANALYTICS
// ==========================================
router.get('/admin/users', authenticateToken, requireRole(['admin', 'bank_officer']), getUsers);
router.put('/admin/users/:id/status', authenticateToken, requireRole(['admin']), updateUserStatus);

router.post('/admin/banks', authenticateToken, requireRole(['admin']), createBank);
router.put('/admin/banks/:id', authenticateToken, requireRole(['admin']), updateBank);
router.delete('/admin/banks/:id', authenticateToken, requireRole(['admin']), deleteBank);

router.get('/admin/audit-logs', authenticateToken, requireRole(['admin']), getAuditLogs);
router.get('/admin/analytics', authenticateToken, requireRole(['admin', 'bank_officer']), getDashboardAnalytics);

// ==========================================
// 6. FUTURE PHASE INTEGRATION SANDBOX
// ==========================================
router.post('/future/ussd', simulateUSSD);
router.post('/future/momo-webhook', simulateMoMoWebhook);
router.post('/future/nida', verifyNationalID);
router.post('/future/credit-score', getCreditScore);
router.post('/future/ai-recommendations', getAIRecommendations);

export default router;

