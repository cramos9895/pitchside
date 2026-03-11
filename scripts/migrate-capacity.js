require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function migrate_capacity() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log('Adding min_teams column...');
    await client.query(`
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS min_teams INTEGER;
    `);

    console.log('Adding max_teams column...');
    await client.query(`
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS max_teams INTEGER;
    `);

    console.log('Adding team_price column...');
    await client.query(`
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS team_price NUMERIC DEFAULT 0;
    `);

    console.log('Adding free_agent_price column...');
    await client.query(`
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS free_agent_price NUMERIC DEFAULT 0;
    `);

    console.log('\nMigration completed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate_capacity();
