import db from './src/config/db.js';

async function test() {
  try {
    const res = await db.query('SELECT * FROM users WHERE email = $1', ['rm@bk.rw']);
    console.log('Query Result:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
