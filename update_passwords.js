import fs from 'fs';

const MOCK_DB_PATH = 'd:/MBI logo/Imali Hub/backend/src/db/mock_db.json';
const dbData = JSON.parse(fs.readFileSync(MOCK_DB_PATH, 'utf8'));

let count = 0;
const badHash = '$2a$10$g15uL/t3zawxpbZDLpMnGe8jkzo.Lv2ai0vF8T/elbXsV/Km2wG7e';
const goodHash = '$2a$10$p9R2Ipew8CQtHLwPbYz5qOAl5DFiRzxT3wJ6Ccb191d9T2ujLAoj2';

dbData.users.forEach(user => {
  if (user.password_hash === badHash) {
    user.password_hash = goodHash;
    count++;
  }
});

fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(dbData, null, 2), 'utf8');
console.log('Updated passwords for ' + count + ' users');
