import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOCK_DB_PATH = path.join(__dirname, '../db/mock_db.json');
const INIT_SQL_PATH = path.join(__dirname, '../db/init.sql');

const { Pool } = pg;

let pool = null;
let useFallback = false;
let mockDbState = {
  users: [],
  banks: [],
  loan_products: [],
  applications: [],
  documents: [],
  notifications: [],
  audit_logs: []
};

// Seed default data for Mock DB (similar to init.sql)
function seedMockDb() {
  // Admin user
  const adminId = 'd3b07384-d113-4956-bc21-0a625a6f23b2';
  const officerId = 'e2b07384-d113-4956-bc21-0a625a6f23b3';
  const citizenId = 'f2b07384-d113-4956-bc21-0a625a6f23b4';

  mockDbState.users = [
    {
      id: adminId,
      email: 'admin@imalihub.rw',
      password_hash: '$2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO', // password123
      full_name: 'Imali Hub Administrator',
      phone_number: '+250780000001',
      national_id: '1199580000000012',
      role: 'admin',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: officerId,
      email: 'officer@bk.rw',
      password_hash: '$2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO', // password123
      full_name: 'Jean Keza',
      phone_number: '+250780000002',
      national_id: '1199580000000013',
      role: 'bank_officer',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: citizenId,
      email: 'citizen@gmail.com',
      password_hash: '$2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO', // password123
      full_name: 'Mugenzi Eric',
      phone_number: '+250788123456',
      national_id: '1199280123456789',
      role: 'citizen',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'a1b07384-d113-4956-bc21-0a625a6f23b5',
      email: 'rm@bk.rw',
      password_hash: '$2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO',
      full_name: 'RM Alice',
      phone_number: '+250788123457',
      national_id: '1199280123456790',
      role: 'relationship_manager',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'b2b07384-d113-4956-bc21-0a625a6f23b6',
      email: 'cm@bk.rw',
      password_hash: '$2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO',
      full_name: 'CM Bob',
      phone_number: '+250788123458',
      national_id: '1199280123456791',
      role: 'credit_manager',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'c3b07384-d113-4956-bc21-0a625a6f23b7',
      email: 'ho@bk.rw',
      password_hash: '$2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO',
      full_name: 'Head Officer Charlie',
      phone_number: '+250788123459',
      national_id: '1199280123456792',
      role: 'head_officer',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'd4b07384-d113-4956-bc21-0a625a6f23b8',
      email: 'analyst@bk.rw',
      password_hash: '$2a$10$tZ3L021hM041M7p/t72v.ORkF2v9mYI73g59LhN548s9W/PzNf/hO',
      full_name: 'Analyst Dave',
      phone_number: '+250788123460',
      national_id: '1199280123456793',
      role: 'analyst',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  const bkId = 'b072da3e-08bb-44ab-9c59-d8e2026857ba';
  const imId = 'c072da3e-08bb-44ab-9c59-d8e2026857bb';
  const eqId = 'd072da3e-08bb-44ab-9c59-d8e2026857bc';

  mockDbState.banks = [
    { id: bkId, name: 'Bank of Kigali', code: 'BK', logo_url: 'https://www.bk.rw/assets/img/logo.png', rating: 4.8, created_at: new Date().toISOString() },
    { id: imId, name: 'I&M Bank Rwanda', code: 'IMB', logo_url: 'https://www.imbank.com/rwanda/logo.png', rating: 4.6, created_at: new Date().toISOString() },
    { id: eqId, name: 'Equity Bank Rwanda', code: 'EQTY', logo_url: 'https://equitygroupholdings.com/rw/logo.png', rating: 4.4, created_at: new Date().toISOString() }
  ];

  mockDbState.loan_products = [
    {
      id: 'l1b07384-d113-4956-bc21-0a625a6f23c1',
      bank_id: bkId,
      name: 'BK Personal Loan',
      loan_type: 'personal',
      interest_rate: 15.5,
      max_amount: 15000000,
      repayment_months: 60,
      requirements: JSON.stringify(['Proof of regular income (Payslip)', 'National ID copy', 'Active BK account']),
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      id: 'l2b07384-d113-4956-bc21-0a625a6f23c2',
      bank_id: bkId,
      name: 'BK Agri-Business Finance',
      loan_type: 'agricultural',
      interest_rate: 12.0,
      max_amount: 50000000,
      repayment_months: 36,
      requirements: JSON.stringify(['Land title (Ubutaka)', 'Project business plan', 'Cooperative membership proof']),
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      id: 'l3b07384-d113-4956-bc21-0a625a6f23c3',
      bank_id: imId,
      name: 'I&M SME Business Loan',
      loan_type: 'business',
      interest_rate: 14.8,
      max_amount: 100000000,
      repayment_months: 48,
      requirements: JSON.stringify(['Business registration (RDB certificate)', '6 months bank statement', 'Tax clearance certificate (RRA)']),
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      id: 'l4b07384-d113-4956-bc21-0a625a6f23c4',
      bank_id: eqId,
      name: 'Equity Mortgage Loan',
      loan_type: 'mortgage',
      interest_rate: 16.0,
      max_amount: 250000000,
      repayment_months: 180,
      requirements: JSON.stringify(['Property valuation report', 'Approved construction plan', 'Proof of steady employment/income']),
      status: 'active',
      created_at: new Date().toISOString()
    }
  ];

  mockDbState.notifications = [
    {
      id: 'n1b07384-d113-4956-bc21-0a625a6f23d1',
      user_id: citizenId,
      title: 'Welcome to Imali Hub',
      message: 'Explore loan rates from leading Rwandan banks and apply securely online.',
      channel: 'in_app',
      status: 'sent',
      created_at: new Date().toISOString()
    }
  ];

  saveMockDb();
}

function loadMockDb() {
  try {
    if (fs.existsSync(MOCK_DB_PATH)) {
      const data = fs.readFileSync(MOCK_DB_PATH, 'utf8');
      mockDbState = JSON.parse(data);
    } else {
      // Ensure folder exists
      fs.mkdirSync(path.dirname(MOCK_DB_PATH), { recursive: true });
      seedMockDb();
    }
  } catch (err) {
    console.error('Error loading mock database, seeding defaults:', err.message);
    seedMockDb();
  }
}

function saveMockDb() {
  try {
    fs.mkdirSync(path.dirname(MOCK_DB_PATH), { recursive: true });
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(mockDbState, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving mock database:', err.message);
  }
}

// Connect to Database
async function initializeDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('\x1b[33m%s\x1b[0m', 'DATABASE_URL environment variable is missing. Falling back to Mock DB.');
    useFallback = true;
    loadMockDb();
    return;
  }

  try {
    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 5000 // fail fast if not reachable
    });
    
    // Prevent unhandled error events from crashing the app
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err.message);
    });

    // Test connection
    const client = await pool.connect();
    console.log('\x1b[32m%s\x1b[0m', 'Connected to PostgreSQL database successfully.');
    
    // Execute init.sql schema
    if (fs.existsSync(INIT_SQL_PATH)) {
      console.log('Running init.sql schema migrations...');
      const sql = fs.readFileSync(INIT_SQL_PATH, 'utf8');
      await client.query(sql);
      console.log('\x1b[32m%s\x1b[0m', 'Database tables and seed data verified/initialized.');
    }
    client.release();
  } catch (err) {
    console.warn('\x1b[31m%s\x1b[0m', `PostgreSQL connection failed: ${err.message}`);
    console.warn('\x1b[33m%s\x1b[0m', 'Falling back to local JSON database for mock operations.');
    if (pool) {
      pool.end().catch(e => console.error('Error ending pool:', e.message));
    }
    useFallback = true;
    loadMockDb();
  }
}

// Initialize database connection
initializeDatabase();

/**
 * Execute SQL Query on PG or use local JSON fallback
 */
async function query(text, params = []) {
  if (!useFallback) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error(`PostgreSQL query error: ${err.message}. SQL: ${text}`);
      throw err;
    }
  }

  // FALLBACK SQL MOCK ENGINE
  // This engine emulates standard CRUD SQL commands executed in this project using Regex.
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const lowerText = normalizedText.toLowerCase();

  try {
    // 1. SELECT queries
    if (lowerText.startsWith('select')) {
      // Find table name
      const fromMatch = normalizedText.match(/from\s+([a-zA-Z0-9_]+)/i);
      if (!fromMatch) throw new Error('Table name not found in SELECT query');
      const tableName = fromMatch[1].toLowerCase();
      
      let records = mockDbState[tableName] || [];
      
      // Parse WHERE clause (simplified)
      const whereMatch = normalizedText.match(/where\s+(.+)$/i);
      if (whereMatch) {
        const whereClause = whereMatch[1];
        // Split by ' AND ' or evaluate simple condition
        const conditions = whereClause.split(/\s+and\s+/i);
        
        records = records.filter(record => {
          return conditions.every(cond => {
            // Match col = $N or col = 'val'
            const eqMatch = cond.match(/([a-zA-Z0-9_]+)\s*=\s*(?:\$(\d+)|'([^']*)'|([0-9.]+))/i);
            if (eqMatch) {
              const field = eqMatch[1].toLowerCase();
              let targetVal;
              if (eqMatch[2]) {
                // parameter placeholder like $1
                const paramIdx = parseInt(eqMatch[2]) - 1;
                targetVal = params[paramIdx];
              } else if (eqMatch[3] !== undefined) {
                targetVal = eqMatch[3];
              } else {
                targetVal = Number(eqMatch[4]);
              }
              
              const recordVal = record[field];
              if (typeof recordVal === 'string' && typeof targetVal === 'string') {
                return recordVal.toLowerCase() === targetVal.toLowerCase();
              }
              return recordVal == targetVal;
            }
            return true;
          });
        });
      }
      
      // Handle simple join for loan products and banks in query if needed
      // (Actually, client side or controller can map bank_name using bank_id)
      
      return { rows: JSON.parse(JSON.stringify(records)), rowCount: records.length };
    }

    // 2. INSERT queries
    if (lowerText.startsWith('insert into')) {
      const insertMatch = normalizedText.match(/insert\s+into\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
      if (!insertMatch) throw new Error('Invalid INSERT statement format');
      
      const tableName = insertMatch[1].toLowerCase();
      const fields = insertMatch[2].split(',').map(f => f.trim().toLowerCase());
      const valuesPlaceholders = insertMatch[3].split(',').map(v => v.trim());
      
      const newRecord = {};
      fields.forEach((field, index) => {
        const placeholder = valuesPlaceholders[index];
        const paramMatch = placeholder.match(/\$(\d+)/);
        if (paramMatch) {
          const paramIdx = parseInt(paramMatch[1]) - 1;
          newRecord[field] = params[paramIdx];
        } else {
          // literal value
          newRecord[field] = placeholder.replace(/'/g, '');
        }
      });

      if (!mockDbState[tableName]) {
        mockDbState[tableName] = [];
      }
      
      // Check for UUID/ID, if not set generate one
      if (!newRecord.id) {
        newRecord.id = 'm-' + Math.random().toString(36).substr(2, 9);
      }
      newRecord.created_at = newRecord.created_at || new Date().toISOString();
      newRecord.updated_at = newRecord.updated_at || new Date().toISOString();

      mockDbState[tableName].push(newRecord);
      saveMockDb();
      return { rows: [JSON.parse(JSON.stringify(newRecord))], rowCount: 1 };
    }

    // 3. UPDATE queries
    if (lowerText.startsWith('update')) {
      const updateMatch = normalizedText.match(/update\s+([a-zA-Z0-9_]+)\s+set\s+(.+)\s+where\s+(.+)/i);
      if (!updateMatch) throw new Error('Invalid UPDATE statement format');

      const tableName = updateMatch[1].toLowerCase();
      const setClause = updateMatch[2];
      const whereClause = updateMatch[3];

      let records = mockDbState[tableName] || [];

      // Parse WHERE clause to find targets (usually id = $X)
      const eqMatch = whereClause.match(/([a-zA-Z0-9_]+)\s*=\s*\$(\d+)/i);
      if (!eqMatch) throw new Error('Unsupported UPDATE WHERE condition');
      const whereField = eqMatch[1].toLowerCase();
      const paramIdx = parseInt(eqMatch[2]) - 1;
      const targetVal = params[paramIdx];

      // Parse SET clause expressions: col1 = $2, col2 = $3
      const setAssignments = setClause.split(',').map(s => s.trim());
      const updates = {};
      setAssignments.forEach(assign => {
        // Matches col = $1 OR col = 'literal'
        const pair = assign.match(/([a-zA-Z0-9_]+)\s*=\s*(?:\$(\d+)|'([^']*)')/i);
        if (pair) {
          const field = pair[1].toLowerCase();
          if (pair[2]) {
            const pIdx = parseInt(pair[2]) - 1;
            updates[field] = params[pIdx];
          } else {
            updates[field] = pair[3];
          }
        }
      });

      let updatedCount = 0;
      mockDbState[tableName] = records.map(record => {
        if (record[whereField] == targetVal) {
          updatedCount++;
          const updated = { ...record, ...updates, updated_at: new Date().toISOString() };
          return updated;
        }
        return record;
      });

      if (updatedCount > 0) {
        saveMockDb();
      }

      return { rowCount: updatedCount, rows: [] };
    }

    // 4. DELETE queries
    if (lowerText.startsWith('delete')) {
      const deleteMatch = normalizedText.match(/delete\s+from\s+([a-zA-Z0-9_]+)\s+where\s+(.+)/i);
      if (!deleteMatch) throw new Error('Invalid DELETE statement format');

      const tableName = deleteMatch[1].toLowerCase();
      const whereClause = deleteMatch[2];

      const eqMatch = whereClause.match(/([a-zA-Z0-9_]+)\s*=\s*\$(\d+)/i);
      if (!eqMatch) throw new Error('Unsupported DELETE WHERE condition');
      const whereField = eqMatch[1].toLowerCase();
      const paramIdx = parseInt(eqMatch[2]) - 1;
      const targetVal = params[paramIdx];

      const initialCount = (mockDbState[tableName] || []).length;
      mockDbState[tableName] = (mockDbState[tableName] || []).filter(record => record[whereField] != targetVal);
      
      const deletedCount = initialCount - mockDbState[tableName].length;
      if (deletedCount > 0) {
        saveMockDb();
      }

      return { rowCount: deletedCount };
    }

    throw new Error(`Unsupported SQL command in Mock DB: ${text}`);
  } catch (err) {
    console.error('Mock DB Query Error:', err.message, text);
    throw err;
  }
}

export default {
  query,
  isFallback: () => useFallback
};
