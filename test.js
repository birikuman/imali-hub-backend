/**
 * Imali Hub - Automated Integration Verification Script
 * Validates auth endpoints, marketplace queries, application flow, and sandboxes.
 */

import dotenv from 'dotenv';
dotenv.config();

// Override PORT to prevent port conflicts during test runner
process.env.PORT = 3099;
process.env.NODE_ENV = 'test';

import logger from './src/utils/logger.js';

const TEST_URL = 'http://localhost:3099/api';

async function runTests() {
  logger.info('====================================================');
  logger.info('STARTING AUTOMATED API INTEGRATION TESTS');
  logger.info('====================================================');

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      passed++;
      logger.success(`[PASS] ${message}`);
    } else {
      failed++;
      logger.error(`[FAIL] ${message}`);
    }
  };

  try {
    // Dynamically import server after PORT override is active
    await import('./src/server.js');
    
    // Wait for server connection checklist
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 1: Register User
    logger.info('Testing User Registration...');
    const registerEmail = `test_citizen_${Date.now()}@imalihub.rw`;
    const regRes = await fetch(`${TEST_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: registerEmail,
        password: 'password123',
        fullName: 'Test Citizen Eric',
        phoneNumber: `+250788${Math.floor(100000 + Math.random() * 900000)}`,
        nationalId: `119958${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        role: 'citizen'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.success === true, 'Register citizen user returns 201 Created');

    // Test 2: Login User
    logger.info('Testing Login...');
    const logRes = await fetch(`${TEST_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: registerEmail,
        password: 'password123'
      })
    });
    const logData = await logRes.json();
    assert(logRes.status === 200 && logData.token !== undefined, 'Login yields 200 OK and JWT token');
    const citizenToken = logData.token;

    // Test 3: Public Loans Catalog
    logger.info('Testing Public Loans Fetch...');
    const loansRes = await fetch(`${TEST_URL}/loans`);
    const loansData = await loansRes.json();
    assert(loansRes.status === 200 && loansData.data.length > 0, `Retrieve active loan products (Found ${loansData.data?.length} products)`);
    const testLoanId = loansData.data[0].id;

    // Test 4: Submit Loan Application
    logger.info('Testing Application Submission...');
    const appRes = await fetch(`${TEST_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${citizenToken}`
      },
      body: JSON.stringify({
        loanProductId: testLoanId,
        amount: 850000,
        termMonths: 36,
        income: 500000,
        currentDebtPayments: 50000
      })
    });
    const appData = await appRes.json();
    assert(appRes.status === 201 && appData.success === true, `Apply for loan product returned 210/201 (App ID: ${appData.applicationId})`);
    const testAppId = appData.applicationId;

    // Test 5: Verify ID Registry Lookup (NIDA Simulator)
    logger.info('Testing NIDA Registry Sandbox lookup...');
    const nidRes = await fetch(`${TEST_URL}/future/nida`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nationalId: '1199580012345678' })
    });
    const nidData = await nidRes.json();
    assert(nidRes.status === 200 && nidData.data.fullName !== undefined, `NIDA Lookup successful for ID. Mapped Name: ${nidData.data.fullName}`);

    // Test 6: Verify Credit Bureau CRB (TransUnion Simulator)
    logger.info('Testing Credit Bureau Inquiry...');
    const crbRes = await fetch(`${TEST_URL}/future/credit-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nationalId: '1199580012345678' })
    });
    const crbData = await crbRes.json();
    assert(crbRes.status === 200 && crbData.data.score > 0, `Credit Score assessment retrieved: ${crbData.data.score} (${crbData.data.rating})`);

    // Test 7: AI Recommendation Engine Matches
    logger.info('Testing AI Recommendations matches...');
    const aiRes = await fetch(`${TEST_URL}/future/ai-recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ income: 500000, purpose: 'agri', termMonths: 36 })
    });
    const aiData = await aiRes.json();
    assert(aiRes.status === 200 && aiData.data.length > 0, `AI recommendation returns ${aiData.data.length} matches`);

    // Test 8: Mobile Money Payout Webhook Callback
    logger.info('Testing MTN MoMo payout webhook status transition...');
    const momoRes = await fetch(`${TEST_URL}/future/momo-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: testAppId,
        transactionId: 'tx-test-993882',
        status: 'SUCCESS',
        provider: 'MTN MoMo'
      })
    });
    const momoData = await momoRes.json();
    assert(momoRes.status === 200 && momoData.success === true, 'Disbursement Webhook callback returns 200 SUCCESS');

    // Test 9: Confirm status changed to disbursed
    logger.info('Verifying application status update in DB...');
    const statusRes = await fetch(`${TEST_URL}/applications/${testAppId}`, {
      headers: { 'Authorization': `Bearer ${citizenToken}` }
    });
    const statusData = await statusRes.json();
    assert(statusRes.status === 200 && statusData.data.status === 'disbursed', `Application status transitioned to: ${statusData.data?.status}`);

    logger.info('====================================================');
    logger.info('INTEGRATION TESTS SUMMARY');
    logger.info(`PASSED: ${passed} | FAILED: ${failed}`);
    logger.info('====================================================');

    // Tear down
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (err) {
    logger.error(`Integration tests crashed: ${err.message}`);
    process.exit(1);
  }
}

// Execute tests
runTests();
