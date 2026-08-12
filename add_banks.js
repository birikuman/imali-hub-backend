import fs from 'fs';
import path from 'path';

const MOCK_DB_PATH = 'd:/MBI logo/Imali Hub/backend/src/db/mock_db.json';
const dbData = JSON.parse(fs.readFileSync(MOCK_DB_PATH, 'utf8'));

const newBanks = [
  {
    id: "g072da3e-08bb-44ab-9c59-d8e2026857bf",
    name: "Urwego Bank (Microfinance)",
    code: "URWG",
    logo_url: "https://urwegobank.com/logo.png",
    rating: 4.1,
    created_at: new Date().toISOString()
  },
  {
    id: "h072da3e-08bb-44ab-9c59-d8e2026857c0",
    name: "Umwalimu SACCO",
    code: "USAC",
    logo_url: "https://umwalimusacco.rw/logo.png",
    rating: 4.7,
    created_at: new Date().toISOString()
  },
  {
    id: "i072da3e-08bb-44ab-9c59-d8e2026857c1",
    name: "Zigama CSS",
    code: "ZCSS",
    logo_url: "https://zigamacss.rw/logo.png",
    rating: 4.8,
    created_at: new Date().toISOString()
  },
  {
    id: "j072da3e-08bb-44ab-9c59-d8e2026857c2",
    name: "BPR Bank Rwanda Plc",
    code: "BPR",
    logo_url: "https://bpr.rw/logo.png",
    rating: 4.5,
    created_at: new Date().toISOString()
  },
  {
    id: "k072da3e-08bb-44ab-9c59-d8e2026857c3",
    name: "Ecobank Rwanda",
    code: "ECO",
    logo_url: "https://ecobank.com/logo.png",
    rating: 4.2,
    created_at: new Date().toISOString()
  },
  {
    id: "l072da3e-08bb-44ab-9c59-d8e2026857c4",
    name: "KCB Bank Rwanda",
    code: "KCB",
    logo_url: "https://kcbgroup.com/logo.png",
    rating: 4.3,
    created_at: new Date().toISOString()
  }
];

// only add if they aren't already there
const existingCodes = dbData.banks.map(b => b.code);
newBanks.forEach(b => {
  if (!existingCodes.includes(b.code)) {
    dbData.banks.push(b);
  }
});

const newLoans = [
  {
    id: "l5b07384-d113-4956-bc21-0a625a6f23c5",
    bank_id: "g072da3e-08bb-44ab-9c59-d8e2026857bf",
    name: "Urwego Micro-Business Loan",
    loan_type: "business",
    interest_rate: 18.0,
    max_amount: 5000000,
    repayment_months: 24,
    requirements: JSON.stringify(["National ID", "Guarantor", "Business License"]),
    status: "active",
    created_at: new Date().toISOString()
  },
  {
    id: "l6b07384-d113-4956-bc21-0a625a6f23c6",
    bank_id: "h072da3e-08bb-44ab-9c59-d8e2026857c0",
    name: "Umwalimu Salary Advance",
    loan_type: "personal",
    interest_rate: 11.0,
    max_amount: 3000000,
    repayment_months: 12,
    requirements: JSON.stringify(["Teacher Contract", "Recent Payslip"]),
    status: "active",
    created_at: new Date().toISOString()
  },
  {
    id: "l7b07384-d113-4956-bc21-0a625a6f23c7",
    bank_id: "i072da3e-08bb-44ab-9c59-d8e2026857c1",
    name: "Zigama Security Loan",
    loan_type: "personal",
    interest_rate: 13.5,
    max_amount: 20000000,
    repayment_months: 48,
    requirements: JSON.stringify(["Military/Police ID", "Payslip"]),
    status: "active",
    created_at: new Date().toISOString()
  },
  {
    id: "l8b07384-d113-4956-bc21-0a625a6f23c8",
    bank_id: "j072da3e-08bb-44ab-9c59-d8e2026857c2",
    name: "BPR Agri Loan",
    loan_type: "agricultural",
    interest_rate: 15.0,
    max_amount: 10000000,
    repayment_months: 36,
    requirements: JSON.stringify(["Land Title", "Agriculture Project Plan"]),
    status: "active",
    created_at: new Date().toISOString()
  }
];

const existingLoanIds = dbData.loan_products.map(l => l.id);
newLoans.forEach(l => {
  if (!existingLoanIds.includes(l.id)) {
    dbData.loan_products.push(l);
  }
});

fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(dbData, null, 2), 'utf8');
console.log('Successfully added microfinance and extra banks to mock_db.json');
