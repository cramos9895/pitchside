require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Adding amount_of_fields column...');
    await client.query(`
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS amount_of_fields INTEGER;
    `);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}
migrate();
