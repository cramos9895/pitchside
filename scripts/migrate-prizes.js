require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function migrate_prizes() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // 1. Add prize_type
    console.log('Adding prize_type column...');
    await client.query(`
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS prize_type TEXT DEFAULT 'none';
    `);

    // 2. Add fixed_prize_amount
    console.log('Adding fixed_prize_amount column...');
    await client.query(`
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS fixed_prize_amount NUMERIC DEFAULT 0;
    `);

    console.log('\nMigration completed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate_prizes();
