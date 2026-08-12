import fs from 'fs';

const MOCK_DB_PATH = 'd:/MBI logo/Imali Hub/backend/src/db/mock_db.json';
const dbData = JSON.parse(fs.readFileSync(MOCK_DB_PATH, 'utf8'));

const analystExists = dbData.users.find(u => u.email === 'analyst@bk.rw');
if (!analystExists) {
  dbData.users.push({
    "id": "d4b07384-d113-4956-bc21-0a625a6f23b8",
    "email": "analyst@bk.rw",
    "password_hash": "$2a$10$g15uL/t3zawxpbZDLpMnGe8jkzo.Lv2ai0vF8T/elbXsV/Km2wG7e", 
    "full_name": "Analyst Dave",
    "phone_number": "+250788123460",
    "national_id": "1199280123456793",
    "role": "analyst",
    "status": "active",
    "created_at": new Date().toISOString(),
    "updated_at": new Date().toISOString()
  });

  fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(dbData, null, 2), 'utf8');
  console.log('Mock DB updated with analyst user');
} else {
  console.log('analyst already exists');
}
