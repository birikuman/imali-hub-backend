import db from '../config/db.js';
import { logAuditEvent } from '../middleware/auth.js';
import logger from '../utils/logger.js';

/**
 * Public loan product search with filters
 */
export async function getLoans(req, res) {
  const { search, bankId, type, maxInterestRate, maxTerm, limit } = req.query;

  try {
    // Perform initial fetch of all active loan products and banks
    const loansRes = await db.query("SELECT * FROM loan_products WHERE status = 'active'");
    const banksRes = await db.query("SELECT * FROM banks");

    const banksMap = {};
    banksRes.rows.forEach(b => {
      banksMap[b.id] = b;
    });

    let products = loansRes.rows.map(prod => ({
      ...prod,
      bank_name: banksMap[prod.bank_id]?.name || 'Unknown Bank',
      bank_code: banksMap[prod.bank_id]?.code || 'N/A',
      bank_logo: banksMap[prod.bank_id]?.logo_url || '',
      bank_rating: banksMap[prod.bank_id]?.rating || 0.0,
      requirements: typeof prod.requirements === 'string' ? JSON.parse(prod.requirements) : prod.requirements
    }));

    // Apply Client filters in Express
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.loan_type.toLowerCase().includes(q) ||
        p.bank_name.toLowerCase().includes(q)
      );
    }

    if (bankId) {
      products = products.filter(p => p.bank_id === bankId);
    }

    if (type) {
      products = products.filter(p => p.loan_type === type);
    }

    if (maxInterestRate) {
      products = products.filter(p => parseFloat(p.interest_rate) <= parseFloat(maxInterestRate));
    }

    if (maxTerm) {
      products = products.filter(p => p.repayment_months <= parseInt(maxTerm));
    }

    if (limit) {
      products = products.slice(0, parseInt(limit));
    }

    return res.status(200).json({ success: true, count: products.length, data: products });
  } catch (err) {
    logger.error(`Error fetching loans: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to retrieve loan options.' });
  }
}

/**
 * Get banks list
 */
export async function getBanks(req, res) {
  try {
    const banksRes = await db.query('SELECT * FROM banks ORDER BY rating DESC');
    return res.status(200).json({ success: true, data: banksRes.rows });
  } catch (err) {
    logger.error(`Error retrieving banks: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving bank list.' });
  }
}

/**
 * Get individual loan detail
 */
export async function getLoanById(req, res) {
  const { id } = req.params;

  try {
    const loanRes = await db.query('SELECT * FROM loan_products WHERE id = $1', [id]);
    if (loanRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loan product not found.' });
    }

    const loan = loanRes.rows[0];
    const bankRes = await db.query('SELECT * FROM banks WHERE id = $1', [loan.bank_id]);
    
    const bank = bankRes.rows[0];
    loan.bank_name = bank ? bank.name : 'Unknown Bank';
    loan.bank_logo = bank ? bank.logo_url : '';
    loan.requirements = typeof loan.requirements === 'string' ? JSON.parse(loan.requirements) : loan.requirements;

    return res.status(200).json({ success: true, data: loan });
  } catch (err) {
    logger.error(`Error retrieving loan details: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error retrieving loan details.' });
  }
}

/**
 * Create a new loan product (Admin / Bank Officer)
 */
export async function createLoan(req, res) {
  const { name, bankId, loanType, interestRate, maxAmount, repaymentMonths, requirements } = req.body;

  if (!name || !bankId || !loanType || !interestRate || !maxAmount || !repaymentMonths) {
    return res.status(400).json({ success: false, message: 'Required fields: name, bankId, loanType, interestRate, maxAmount, repaymentMonths.' });
  }

  try {
    const newId = 'l-' + Math.random().toString(36).substr(2, 9);
    const requirementsStr = Array.isArray(requirements) ? JSON.stringify(requirements) : JSON.stringify([]);

    await db.query(
      `INSERT INTO loan_products (id, bank_id, name, loan_type, interest_rate, max_amount, repayment_months, requirements, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        newId,
        bankId,
        name,
        loanType,
        interestRate,
        maxAmount,
        repaymentMonths,
        requirementsStr,
        'active',
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    await logAuditEvent(req.user.id, 'LOAN_PRODUCT_CREATE', `Created loan product: ${name} (${newId})`);

    return res.status(201).json({ success: true, message: 'Loan product created successfully.', id: newId });
  } catch (err) {
    logger.error(`Error creating loan: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error creating loan product.' });
  }
}

/**
 * Update an existing loan product (Admin / Bank Officer)
 */
export async function updateLoan(req, res) {
  const { id } = req.params;
  const { name, loanType, interestRate, maxAmount, repaymentMonths, requirements, status } = req.body;

  try {
    const checkProduct = await db.query('SELECT * FROM loan_products WHERE id = $1', [id]);
    if (checkProduct.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loan product not found.' });
    }

    const current = checkProduct.rows[0];
    const updatedName = name || current.name;
    const updatedType = loanType || current.loan_type;
    const updatedRate = interestRate || current.interest_rate;
    const updatedMax = maxAmount || current.max_amount;
    const updatedRepay = repaymentMonths || current.repayment_months;
    const updatedReqs = Array.isArray(requirements) ? JSON.stringify(requirements) : (requirements || current.requirements);
    const updatedStatus = status || current.status;

    await db.query(
      `UPDATE loan_products
       SET name = $1, loan_type = $2, interest_rate = $3, max_amount = $4, repayment_months = $5, requirements = $6, status = $7, updated_at = $8
       WHERE id = $9`,
      [updatedName, updatedType, updatedRate, updatedMax, updatedRepay, updatedReqs, updatedStatus, new Date().toISOString(), id]
    );

    await logAuditEvent(req.user.id, 'LOAN_PRODUCT_UPDATE', `Updated loan product ID: ${id}`);

    return res.status(200).json({ success: true, message: 'Loan product updated successfully.' });
  } catch (err) {
    logger.error(`Error updating loan product: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error updating loan product.' });
  }
}

/**
 * Delete a loan product (Admin / Bank Officer)
 */
export async function deleteLoan(req, res) {
  const { id } = req.params;

  try {
    const checkProduct = await db.query('SELECT * FROM loan_products WHERE id = $1', [id]);
    if (checkProduct.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loan product not found.' });
    }

    await db.query('DELETE FROM loan_products WHERE id = $1', [id]);
    await logAuditEvent(req.user.id, 'LOAN_PRODUCT_DELETE', `Deleted loan product ID: ${id}`);

    return res.status(200).json({ success: true, message: 'Loan product removed from directory.' });
  } catch (err) {
    logger.error(`Error deleting loan: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Server error deleting loan product.' });
  }
}
