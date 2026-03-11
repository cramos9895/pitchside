const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  let dbUrl = '';
  envFile.split('\n').forEach(line => {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=')[1].trim().replace(/['"]/g, '');
    }
  });

  if (!dbUrl) {
    console.error('DATABASE_URL not found in .env.local');
    return;
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  
  try {
    const query = `
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS is_league BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS total_weeks INTEGER,
      ADD COLUMN IF NOT EXISTS is_playoff_included BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS team_roster_fee NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS min_players_per_team INTEGER DEFAULT 0;

      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS custom_invite_fee NUMERIC,
      ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;
    `;
    await client.query(query);
    console.log('Successfully applied database migrations for Phase 43!');
  } catch (err) {
    console.error('Error executing migration:', err);
  } finally {
    await client.end();
  }
}
run();
