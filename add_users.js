import fs from 'fs';
import path from 'path';

const MOCK_DB_PATH = 'd:/MBI logo/Imali Hub/backend/src/db/mock_db.json';
let dbData = JSON.parse(fs.readFileSync(MOCK_DB_PATH, 'utf8'));

// Check if user exists
const rmExists = dbData.users.find(u => u.email === 'rm@bk.rw');
if (!rmExists) {
  dbData.users.push({
    "id": "a1b07384-d113-4956-bc21-0a625a6f23b5",
    "email": "rm@bk.rw",
    "password_hash": "$2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO",
    "full_name": "RM Alice",
    "phone_number": "+250788123457",
    "national_id": "1199280123456790",
    "role": "relationship_manager",
    "status": "active",
    "created_at": new Date().toISOString(),
    "updated_at": new Date().toISOString()
  });
}

const cmExists = dbData.users.find(u => u.email === 'cm@bk.rw');
if (!cmExists) {
  dbData.users.push({
    "id": "b2b07384-d113-4956-bc21-0a625a6f23b6",
    "email": "cm@bk.rw",
    "password_hash": "$2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO",
    "full_name": "CM Bob",
    "phone_number": "+250788123458",
    "national_id": "1199280123456791",
    "role": "credit_manager",
    "status": "active",
    "created_at": new Date().toISOString(),
    "updated_at": new Date().toISOString()
  });
}

fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(dbData, null, 2), 'utf8');
console.log('Mock DB updated with users');
