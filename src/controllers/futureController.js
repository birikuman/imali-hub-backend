import db from '../config/db.js';
import { logAuditEvent } from '../middleware/auth.js';
import logger from '../utils/logger.js';

/**
 * 1. USSD Simulator Engine
 * Input format: { phoneNumber: string, text: string }
 * Returns USSD text responses mimicking standard Telco integrations.
 */
export async function simulateUSSD(req, res) {
  const { phoneNumber, text = '' } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'phoneNumber is required.' });
  }

  // Text contains inputs separated by stars (*), representing session history. e.g., '1*2'
  const steps = text === '' ? [] : text.split('*');
  const level = steps.length;
  
  let responseText = '';
  let action = 'CON'; // CON = Continue, END = End session

  try {
    if (level === 0) {
      // Main menu
      responseText = 
        `Muraho! Welcome to Imali Hub USSD Service.\n` +
        `1. Compare Loans\n` +
        `2. Check My Application Status\n` +
        `3. Financial Literacy Tip`;
    } else if (steps[0] === '1') {
      // Compare Loans flow
      if (level === 1) {
        responseText = 
          `Select Loan Category:\n` +
          `1. Personal Loan\n` +
          `2. Business Loan\n` +
          `3. Agricultural Loan\n` +
          `4. Mortgage`;
      } else if (level === 2) {
        const types = ['personal', 'business', 'agricultural', 'mortgage'];
        const typeIdx = parseInt(steps[1]) - 1;
        const selectedType = types[typeIdx] || 'personal';

        // Load active loans of this type
        const lpRes = await db.query(
          "SELECT lp.*, b.name as bank_name FROM loan_products lp JOIN banks b ON lp.bank_id = b.id WHERE lp.loan_type = $1 AND lp.status = 'active' LIMIT 3",
          [selectedType]
        );

        if (lpRes.rows.length === 0) {
          responseText = `Sorry, no active loan offers found in this category.\n0. Back`;
        } else {
          responseText = `Best Rates (${selectedType}):\n`;
          lpRes.rows.forEach((lp, i) => {
            responseText += `${i + 1}. ${lp.bank_name}: ${lp.interest_rate}%\n`;
          });
          responseText += `Select offer for details:`;
        }
      } else if (level === 3) {
        // Show selected loan details
        const types = ['personal', 'business', 'agricultural', 'mortgage'];
        const typeIdx = parseInt(steps[1]) - 1;
        const selectedType = types[typeIdx] || 'personal';
        const offerIdx = parseInt(steps[2]) - 1;

        const lpRes = await db.query(
          "SELECT lp.*, b.name as bank_name FROM loan_products lp JOIN banks b ON lp.bank_id = b.id WHERE lp.loan_type = $1 AND lp.status = 'active' LIMIT 3",
          [selectedType]
        );

        const selectedLoan = lpRes.rows[offerIdx];
        if (!selectedLoan) {
          responseText = `Invalid choice.\n0. Back`;
        } else {
          action = 'END';
          responseText = 
            `Loan: ${selectedLoan.name}\n` +
            `Bank: ${selectedLoan.bank_name}\n` +
            `Rate: ${selectedLoan.interest_rate}%\n` +
            `Max: RWF ${selectedLoan.max_amount.toLocaleString()}\n` +
            `Apply online: imalihub.rw`;
        }
      }
    } else if (steps[0] === '2') {
      // Application Status flow
      if (level === 1) {
        responseText = `Please enter your 16-digit Rwandan National ID:`;
      } else if (level === 2) {
        const nid = steps[1].trim();
        if (nid.length !== 16 || isNaN(nid)) {
          responseText = `Error: National ID must be exactly 16 digits.\n0. Back`;
        } else {
          // Look up user by National ID
          const userRes = await db.query('SELECT * FROM users WHERE national_id = $1', [nid]);
          if (userRes.rows.length === 0) {
            action = 'END';
            responseText = `No account found with this ID.\nRegister on imalihub.rw`;
          } else {
            const user = userRes.rows[0];
            // Get latest application
            const appRes = await db.query(
              `SELECT app.*, lp.name as product_name FROM applications app
               JOIN loan_products lp ON app.loan_product_id = lp.id
               WHERE app.user_id = $1 ORDER BY app.created_at DESC LIMIT 1`,
              [user.id]
            );

            action = 'END';
            if (appRes.rows.length === 0) {
              responseText = `Hello ${user.full_name}, you have no active loan applications.`;
            } else {
              const latestApp = appRes.rows[0];
              responseText = 
                `Hello ${user.full_name}.\n` +
                `Loan: ${latestApp.product_name}\n` +
                `Amount: RWF ${parseFloat(latestApp.amount).toLocaleString()}\n` +
                `Status: ${latestApp.status.toUpperCase().replace(/_/g, ' ')}`;
            }
          }
        }
      }
    } else if (steps[0] === '3') {
      // Literacy Tip
      action = 'END';
      const tips = [
        "Financial Tip: Always check the APR (Annual Percentage Rate) before agreeing to a loan, as it includes hidden processing fees.",
        "Financial Tip: Rwandan credit scores improve when you pay off mobile credit loans (e.g. MTN Ikarabo) on time.",
        "Financial Tip: Keep your debt-to-income ratio below 40% to remain highly creditworthy in local banks."
      ];
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      responseText = randomTip;
    } else {
      action = 'END';
      responseText = `Invalid selection. Session terminated.`;
    }

    return res.status(200).send(`${action} ${responseText}`);
  } catch (err) {
    logger.error(`USSD Simulator Error: ${err.message}`);
    return res.status(500).send('END System error, please try again later.');
  }
}

/**
 * 2. Mobile Money Webhooks Simulator
 * Simulates telecom triggers (MTN MoMo, Airtel Money) for payouts
 */
export async function simulateMoMoWebhook(req, res) {
  const { applicationId, transactionId, status, provider } = req.body; // status: SUCCESS, FAILED

  if (!applicationId || !transactionId || !status) {
    return res.status(400).json({ success: false, message: 'applicationId, transactionId, and status are required.' });
  }

  try {
    const appRes = await db.query('SELECT * FROM applications WHERE id = $1', [applicationId]);
    if (appRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const application = appRes.rows[0];
    const prov = provider || 'MTN MoMo';

    if (status === 'SUCCESS') {
      // Update app status to disbursed
      await db.query(
        "UPDATE applications SET status = 'disbursed', notes = $1, updated_at = $2 WHERE id = $3",
        [`Loan disbursed via ${prov}. Txn Ref: ${transactionId}`, new Date().toISOString(), applicationId]
      );

      // Create notification
      await db.query(
        `INSERT INTO notifications (id, user_id, title, message, channel, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'n-' + Math.random().toString(36).substr(2, 9),
          application.user_id,
          'Loan Disbursed!',
          `RWF ${parseFloat(application.amount).toLocaleString()} successfully deposited to your Mobile Money account via ${prov}. Ref: ${transactionId}.`,
          'sms',
          'sent',
          new Date().toISOString()
        ]
      );

      await logAuditEvent('system', 'MOMO_DISBURSEMENT_SUCCESS', `Successfully disbursed funds for app ${applicationId} via ${prov}`);
      return res.status(200).json({ success: true, message: `Disbursement webhook processed. Application updated to DISBURSED.` });
    } else {
      // Log failed payment webhook
      logger.warn(`Mobile Money payout transaction ${transactionId} failed for application ID ${applicationId}`);
      await logAuditEvent('system', 'MOMO_DISBURSEMENT_FAILED', `Failed MoMo payout transaction for app ${applicationId}`);
      return res.status(200).json({ success: false, message: 'Payout failure registered.' });
    }
  } catch (err) {
    logger.error(`MoMo Webhook simulation error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Internal server error processing webhook.' });
  }
}

/**
 * 3. National ID (NIDA) Registry Verification Simulator
 */
export async function verifyNationalID(req, res) {
  const { nationalId } = req.body;

  if (!nationalId || nationalId.length !== 16 || isNaN(nationalId)) {
    return res.status(400).json({ success: false, message: 'Invalid National ID. Must be exactly 16 digits.' });
  }

  try {
    // 1. Try to find an existing user with this National ID in our database
    const userRes = await db.query('SELECT full_name FROM users WHERE national_id = $1', [nationalId]);
    let fullName = '';

    // 2. Generate deterministic Rwandan user data based on NID
    const yearPrefix = nationalId.substring(1, 5); // e.g. 11995 -> 1995 birth year
    const isFemale = parseInt(nationalId.substring(5, 6)) % 2 === 0;
    const birthYear = parseInt(yearPrefix) < 1920 ? 1990 : parseInt(yearPrefix);

    if (userRes.rows.length > 0) {
      // Use the actual registered name if found
      fullName = userRes.rows[0].full_name;
    } else {
      // Fallback: algorithmic name generation
      const firstNames = isFemale ? ['Alice', 'Keza', 'Grace', 'Chantal', 'Divine'] : ['Eric', 'Mugisha', 'Jean', 'Aimable', 'Kagabo'];
      const lastNames = ['Mugenzi', 'Nshuti', 'Habimana', 'Gasana', 'Tuyishime', 'Nsengiyumva', 'Uwimana'];

      const hashVal = parseInt(nationalId.substring(12, 16)) || 1000;
      const firstName = firstNames[hashVal % firstNames.length];
      const lastName = lastNames[(hashVal + 3) % lastNames.length];
      fullName = `${lastName} ${firstName}`;
    }

    return res.status(200).json({
      success: true,
      data: {
        nationalId,
        fullName,
        dateOfBirth: `${birthYear}-06-15`,
        gender: isFemale ? 'Female' : 'Male',
        province: 'Kigali City',
        district: 'Nyarugenge',
        status: 'verified',
        issuedDate: `${birthYear + 18}-01-20`
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error during NIDA verification.' });
  }
}

/**
 * 4. Credit Score Simulator (TransUnion Rwanda Mock)
 */
export async function getCreditScore(req, res) {
  const { nationalId } = req.body;

  if (!nationalId) {
    return res.status(400).json({ success: false, message: 'National ID is required for Credit Inquiry.' });
  }

  // Deterministic credit score based on NID numeric digits
  const sum = nationalId.split('').reduce((acc, char) => acc + parseInt(char), 0);
  const baseScore = 400 + (sum * 5); // generates values between 400 and 850
  const finalScore = Math.min(850, Math.max(300, baseScore));

  const rating = finalScore > 750 ? 'Excellent' : finalScore > 680 ? 'Good' : finalScore > 580 ? 'Fair' : 'Poor';

  return res.status(200).json({
    success: true,
    data: {
      score: finalScore,
      rating,
      activeAccountsCount: sum % 4,
      defaultsCount: sum % 11 === 0 ? 1 : 0,
      inquiriesCount: sum % 6,
      provider: 'TransUnion Rwanda (CRB)'
    }
  });
}

/**
 * 5. AI Loan Recommendation Engine Simulator
 */
export async function getAIRecommendations(req, res) {
  const { income, purpose, termMonths } = req.body;

  if (!income || !purpose) {
    return res.status(400).json({ success: false, message: 'Monthly income and loan purpose are required.' });
  }

  try {
    const loansRes = await db.query("SELECT lp.*, b.name as bank_name FROM loan_products lp JOIN banks b ON lp.bank_id = b.id WHERE lp.status = 'active'");
    
    // Simple matching scoring logic
    const mapped = loansRes.rows.map(loan => {
      let matchScore = 70; // baseline match

      // 1. Term length matches
      if (termMonths) {
        const diff = Math.abs(loan.repayment_months - parseInt(termMonths));
        if (diff <= 12) matchScore += 15;
        else if (diff > 36) matchScore -= 10;
      }

      // 2. Type matches purpose
      const p = purpose.toLowerCase();
      if (p.includes('farm') || p.includes('crop') || p.includes('agri')) {
        if (loan.loan_type === 'agricultural') matchScore += 20;
      } else if (p.includes('business') || p.includes('shop') || p.includes('sme') || p.includes('company')) {
        if (loan.loan_type === 'business') matchScore += 20;
      } else if (p.includes('house') || p.includes('land') || p.includes('build')) {
        if (loan.loan_type === 'mortgage') matchScore += 20;
      } else {
        if (loan.loan_type === 'personal') matchScore += 20;
      }

      // 3. Rate matching (lower rates get higher scores)
      const rateScore = Math.max(0, 20 - parseFloat(loan.interest_rate));
      matchScore += Math.round(rateScore);

      // Cap match percentage
      matchScore = Math.min(99, Math.max(45, matchScore));

      return {
        ...loan,
        requirements: typeof loan.requirements === 'string' ? JSON.parse(loan.requirements) : loan.requirements,
        matchPercentage: matchScore,
        recommendationReason: `Recommended based on your income bracket and matching ${loan.loan_type} category with competitive interest rate of ${loan.interest_rate}%.`
      };
    });

    // Sort descending by match percentage
    mapped.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return res.status(200).json({
      success: true,
      data: mapped.slice(0, 2) // Return top 2 matching products
    });
  } catch (err) {
    logger.error(`AI Recommendation error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Recommendation engine failed.' });
  }
}
