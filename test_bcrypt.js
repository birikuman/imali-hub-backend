import bcrypt from 'bcryptjs';

async function test() {
  const hash = await bcrypt.hash('password123', 10);
  console.log('New hash for password123:', hash);
}

test();
