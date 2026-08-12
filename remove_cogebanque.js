import fs from 'fs';
import path from 'path';

const MOCK_DB_PATH = 'd:/MBI logo/Imali Hub/backend/src/db/mock_db.json';
const dbData = JSON.parse(fs.readFileSync(MOCK_DB_PATH, 'utf8'));

// Filter out Cogebanque
const cogeId = "e072da3e-08bb-44ab-9c59-d8e2026857bd";
dbData.banks = dbData.banks.filter(b => b.id !== cogeId);

// Filter out loans associated with Cogebanque
dbData.loan_products = dbData.loan_products.filter(l => l.bank_id !== cogeId);

fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(dbData, null, 2), 'utf8');
console.log('Successfully removed Cogebanque from mock_db.json');
