import fs from 'fs';
import path from 'path';

const MOCK_DB_PATH = 'd:/MBI logo/Imali Hub/backend/src/db/mock_db.json';
const dbData = JSON.parse(fs.readFileSync(MOCK_DB_PATH, 'utf8'));

dbData.applications = dbData.applications.map(app => {
  if (!app.assigned_role) {
    app.assigned_role = 'relationship_manager';
    app.assigned_user_id = null;
  }
  return app;
});

fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(dbData, null, 2), 'utf8');
console.log('Mock DB updated with assigned_role');
