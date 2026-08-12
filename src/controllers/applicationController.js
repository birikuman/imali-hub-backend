import db from '../config/db.js';
import { logAuditEvent } from '../middleware/auth.js';
import logger from '../utils/logger.js';

/**
 * Submit a loan application
 */
export async function createApplication(req, res) {
  const { loanProductId, amount, termMonths, income, currentDebtPayments, applicationData } = req.body;

  if (!loanProductId || !amount || !termMonths || !income) {
    return res.status(400).json({ success: false, message: 'Missing application details: loanProductId, amount, termMonths, income.' });
  }

  try {
    // Check if product exists
    const checkProduct = await db.query('SELECT * FROM loan_products WHERE id = $1', [loanProductId]);
    if (checkProduct.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Selected loan product not found.' });
    }
    const product = checkProduct.rows[0];

    // Fraud Detection check: verify if the user already has a pending application for the same product in the last 30 days
    const fraudCheck = await db.query(
      `SELECT * FROM applications 
       WHERE user_id = $1 AND loan_product_id = $2 AND status NOT IN ('approved', 'rejected', 'disbursed')`,
      [req.user.id, loanProductId]
    );

    if (fraudCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Suspicious activity detected: You already have an active application under review for this loan product.'
      });
    }

    // Mock Credit scoring calculation (300-850) based on phone number prefix & income
    // (a nice realistic mock engine for Rwanda's ecosystem)
    let creditScore = 650;
    const userPhone = req.user.phoneNumber || '';
    if (userPhone.includes('788') || userPhone.includes('789')) {
      creditScore += 50; // MTN high tier customers typically have longer histories in our mock
    }
    const ratio = parseFloat(currentDebtPayments || '0') / parseFloat(income);
    if (ratio > 0.4) {
      creditScore -= 80; // High debt burden lowers credit score
    } else {
      creditScore += 30;
    }
    // Cap score
    creditScore = Math.min(850, Math.max(300, creditScore));

    const appId = 'app-' + Math.random().toString(36).substr(2, 9);
    const incomeToDebtPercent = parseFloat((ratio * 100).toFixed(2));

    await db.query(
      `INSERT INTO applications (id, user_id, loan_product_id, amount, term_months, status, notes, credit_score_estimate, income_to_debt_ratio, application_data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        appId,
        req.user.id,
        loanProductId,
        amount,
        termMonths,
        'submitted', // Set to submitted for immediate review in mock flow
        'Initial online submission',
        creditScore,
        incomeToDebtPercent,
        applicationData ? JSON.stringify(applicationData) : null,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    // Create system notification
    await db.query(
      `INSERT INTO notifications (id, user_id, title, message, channel, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'n-' + Math.random().toString(36).substr(2, 9),
        req.user.id,
        'Application Submitted',
        `Your application of RWF ${amount} for ${product.name} has been submitted. Status: Submitted.`,
        'in_app',
        'sent',
        new Date().toISOString()
      ]
    );

    // Audit trace
    await logAuditEvent(req.user.id, 'APPLICATION_CREATE', `Submitted application: ID ${appId} for loan ${loanProductId} amount RWF ${amount}`);

    return res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully.',
      applicationId: appId,
      creditScore,
      debtRatio: incomeToDebtPercent
    });
  } catch (err) {
    logger.error(`Application creation error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error processing application.' });
  }
}

/**
 * Fetch applications (filter based on user roles)
 */
export async function getApplications(req, res) {
  try {
    let queryText = '';
    let params = [];

    if (req.user.role === 'citizen') {
      queryText = 'SELECT * FROM applications WHERE user_id = $1 ORDER BY created_at DESC';
      params = [req.user.id];
    } else if (req.user.role === 'relationship_manager') {
      queryText = 'SELECT * FROM applications WHERE assigned_role = $1 ORDER BY created_at DESC';
      params = ['relationship_manager'];
    } else if (req.user.role === 'credit_manager') {
      queryText = 'SELECT * FROM applications WHERE assigned_role = $1 ORDER BY created_at DESC';
      params = ['credit_manager'];
    } else if (req.user.role === 'head_officer') {
      queryText = 'SELECT * FROM applications WHERE assigned_role = $1 ORDER BY created_at DESC';
      params = ['head_officer'];
    } else if (req.user.role === 'analyst') {
      queryText = 'SELECT * FROM applications WHERE assigned_role = $1 ORDER BY created_at DESC';
      params = ['analyst'];
    } else {
      // Officers/Admins see all
      queryText = 'SELECT * FROM applications ORDER BY created_at DESC';
    }

    const appsRes = await db.query(queryText, params);
    
    // Supplement data with Loan Product name and Applicant details
    const productsRes = await db.query('SELECT lp.id, lp.name, lp.interest_rate, b.name as bank_name FROM loan_products lp JOIN banks b ON lp.bank_id = b.id');
    const usersRes = await db.query('SELECT id, full_name, email, phone_number, national_id FROM users');

    const productsMap = {};
    productsRes.rows.forEach(p => {
      productsMap[p.id] = p;
    });

    const usersMap = {};
    usersRes.rows.forEach(u => {
      usersMap[u.id] = u;
    });

    const enrichedApps = appsRes.rows.map(app => ({
      ...app,
      loan_product_name: productsMap[app.loan_product_id]?.name || 'Unknown Loan',
      bank_name: productsMap[app.loan_product_id]?.bank_name || 'Unknown Bank',
      interest_rate: productsMap[app.loan_product_id]?.interest_rate || 0.0,
      applicant_name: usersMap[app.user_id]?.full_name || 'Deleted User',
      applicant_email: usersMap[app.user_id]?.email || '',
      applicant_phone: usersMap[app.user_id]?.phone_number || '',
      applicant_national_id: usersMap[app.user_id]?.national_id || ''
    }));

    return res.status(200).json({ success: true, count: enrichedApps.length, data: enrichedApps });
  } catch (err) {
    logger.error(`Error loading applications: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to retrieve applications.' });
  }
}

/**
 * Get individual application detail
 */
export async function getApplicationById(req, res) {
  const { id } = req.params;

  try {
    const appRes = await db.query('SELECT * FROM applications WHERE id = $1', [id]);
    if (appRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const app = appRes.rows[0];

    // Access control: Citizens can only see their own applications
    if (req.user.role === 'citizen' && app.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied. You do not own this application.' });
    }

    // Load loan product & bank details
    const productRes = await db.query('SELECT lp.id, lp.name, b.name as bank_name FROM loan_products lp JOIN banks b ON lp.bank_id = b.id WHERE lp.id = $1', [app.loan_product_id]);
    const userRes = await db.query('SELECT id, full_name, email, phone_number, national_id FROM users WHERE id = $1', [app.user_id]);
    const docsRes = await db.query('SELECT * FROM documents WHERE application_id = $1', [app.id]);
    const auditRes = await db.query('SELECT * FROM audit_logs WHERE details LIKE $1 ORDER BY created_at DESC', [`%ID ${app.id}%`]);

    app.loan_product_name = productRes.rows[0]?.name || 'Unknown Loan';
    app.bank_name = productRes.rows[0]?.bank_name || 'Unknown Bank';
    app.applicant = userRes.rows[0] || {};
    app.documents = docsRes.rows || [];
    app.history = auditRes.rows || []; // Audit logs provide step-by-step history

    return res.status(200).json({ success: true, data: app });
  } catch (err) {
    logger.error(`Error loading application detail: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch application data.' });
  }
}

/**
 * Update application status (Admin/Officer role)
 */
export async function updateApplicationStatus(req, res) {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['draft', 'submitted', 'under_review', 'additional_documents_requested', 'approved', 'rejected', 'disbursed'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status parameter.' });
  }

  try {
    const checkApp = await db.query('SELECT * FROM applications WHERE id = $1', [id]);
    if (checkApp.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const application = checkApp.rows[0];

    // Perform state transition check
    await db.query(
      'UPDATE applications SET status = $1, notes = $2, updated_at = $3 WHERE id = $4',
      [status, notes || application.notes, new Date().toISOString(), id]
    );

    // Create Notification for the citizen
    const messageDetails = `Your loan application ID ${id} status has been updated to "${status.toUpperCase().replace(/_/g, ' ')}" by the Bank Officer. Notes: ${notes || 'None'}`;
    
    // In-App Notification
    await db.query(
      `INSERT INTO notifications (id, user_id, title, message, channel, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'n-' + Math.random().toString(36).substr(2, 9),
        application.user_id,
        'Application Status Update',
        messageDetails,
        'in_app',
        'sent',
        new Date().toISOString()
      ]
    );

    // Mock SMS / Email notification outputs
    logger.info(`[SMS Simulator] Dispatch SMS to User ID ${application.user_id}: "${messageDetails}"`);
    logger.info(`[SMTP Simulator] Dispatch Email to User ID ${application.user_id}: "${messageDetails}"`);

    // Audit logs for workflow history tracking
    await logAuditEvent(req.user.id, 'APPLICATION_STATUS_UPDATE', `Updated application ID ${id} state to ${status}. Details: ${notes}`);

    return res.status(200).json({ success: true, message: `Application updated to ${status} successfully.` });
  } catch (err) {
    logger.error(`Status update error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to update application status.' });
  }
}

/**
 * Forward application to another role
 */
export async function forwardApplication(req, res) {
  const { id } = req.params;
  const { assigned_role, assigned_user_id } = req.body;

  if (!assigned_role) {
    return res.status(400).json({ success: false, message: 'Missing assigned_role.' });
  }

  try {
    const appCheck = await db.query('SELECT * FROM applications WHERE id = $1', [id]);
    if (appCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    await db.query(
      `UPDATE applications SET assigned_role = $1, assigned_user_id = $2 WHERE id = $3`,
      [assigned_role, assigned_user_id || null, id]
    );

    // Audit logs for workflow history tracking
    await logAuditEvent(req.user.id, 'APPLICATION_FORWARD', `Forwarded application ID ${id} to ${assigned_role}`);

    return res.status(200).json({ success: true, message: `Application forwarded to ${assigned_role} successfully.` });
  } catch (err) {
    logger.error(`Forward error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to forward application.' });
  }
}

/**
 * Handle Document Upload and attach to Application
 */
export async function uploadDocument(req, res) {
  const { applicationId, documentType } = req.body;

  if (!applicationId || !documentType) {
    return res.status(400).json({ success: false, message: 'Missing parameters: applicationId, documentType.' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Document file attachment is required.' });
  }

  try {
    const appCheck = await db.query('SELECT * FROM applications WHERE id = $1', [applicationId]);
    if (appCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application reference not found.' });
    }

    const app = appCheck.rows[0];

    // Citizens can only upload documents to their own application
    if (req.user.role === 'citizen' && app.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not own this application.' });
    }

    const docId = 'doc-' + Math.random().toString(36).substr(2, 9);
    
    // Insert document details
    await db.query(
      `INSERT INTO documents (id, application_id, user_id, document_type, file_name, file_path, file_size, mime_type, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        docId,
        applicationId,
        req.user.id,
        documentType,
        req.file.filename,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        new Date().toISOString()
      ]
    );

    // Audit logs entry
    await logAuditEvent(req.user.id, 'DOCUMENT_UPLOAD', `Uploaded ${documentType} file: ${req.file.filename} for application ID ${applicationId}`);

    return res.status(201).json({
      success: true,
      message: 'Document uploaded and linked successfully.',
      documentId: docId,
      fileName: req.file.filename
    });
  } catch (err) {
    logger.error(`Document upload error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Database save error during document attachment.' });
  }
}
