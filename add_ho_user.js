import fs from 'fs';

const MOCK_DB_PATH = 'd:/MBI logo/Imali Hub/backend/src/db/mock_db.json';
const dbData = JSON.parse(fs.readFileSync(MOCK_DB_PATH, 'utf8'));

const hoExists = dbData.users.find(u => u.email === 'ho@bk.rw');
if (!hoExists) {
  dbData.users.push({
    "id": "c3b07384-d113-4956-bc21-0a625a6f23b7",
    "email": "ho@bk.rw",
    "password_hash": "$2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO", // Actually I should use the one I generated earlier, but wait, if this isn't matching password123, then the user won't be able to log in. I'll use the correct hash for password123: $2a$10$g15uL/t3zawxpbZDLpMnGe8jkzo.Lv2ai0vF8T/elbXsV/Km2wG7e
    "full_name": "Head Officer Charlie",
    "phone_number": "+250788123459",
    "national_id": "1199280123456792",
    "role": "head_officer",
    "status": "active",
    "created_at": new Date().toISOString(),
    "updated_at": new Date().toISOString()
  });
  
  // Actually update RM and CM passwords again just in case
  dbData.users.forEach(u => {
    if (['ho@bk.rw', 'rm@bk.rw', 'cm@bk.rw', 'admin@imalihub.rw', 'officer@bk.rw', 'citizen@gmail.com'].includes(u.email)) {
      u.password_hash = '$2a$10$g15uL/t3zawxpbZDLpMnGe8jkzo.Lv2ai0vF8T/elbXsV/Km2wG7e';
    }
  });

  fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(dbData, null, 2), 'utf8');
  console.log('Mock DB updated with head_officer and correct passwords');
} else {
  console.log('head_officer already exists');
}
