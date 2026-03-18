const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_string: `
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS amount_of_fields integer,
      ADD COLUMN IF NOT EXISTS min_teams integer,
      ADD COLUMN IF NOT EXISTS max_teams integer,
      ADD COLUMN IF NOT EXISTS team_price numeric,
      ADD COLUMN IF NOT EXISTS free_agent_price numeric,
      ADD COLUMN IF NOT EXISTS total_weeks integer,
      ADD COLUMN IF NOT EXISTS is_playoff_included boolean,
      ADD COLUMN IF NOT EXISTS team_roster_fee numeric,
      ADD COLUMN IF NOT EXISTS deposit_amount numeric,
      ADD COLUMN IF NOT EXISTS min_players_per_team integer,
      ADD COLUMN IF NOT EXISTS description text,
      ADD COLUMN IF NOT EXISTS reward text,
      ADD COLUMN IF NOT EXISTS prize_type text,
      ADD COLUMN IF NOT EXISTS fixed_prize_amount numeric,
      ADD COLUMN IF NOT EXISTS prize_pool_percentage numeric,
      ADD COLUMN IF NOT EXISTS refund_cutoff_date timestamptz,
      ADD COLUMN IF NOT EXISTS roster_lock_date timestamptz,
      ADD COLUMN IF NOT EXISTS strict_waiver_required boolean,
      ADD COLUMN IF NOT EXISTS mercy_rule_cap integer,
      ADD COLUMN IF NOT EXISTS is_league boolean;
      
      NOTIFY pgrst, 'reload schema';
    `
  });
  
  if (error) {
    if (error.message.includes('Could not find the function public.exec_sql')) {
      console.log('No exec_sql function found. Please run SQL manually in dashboard.');
    } else {
      console.error('Error:', error);
    }
  } else {
    console.log('Migration successful:', data);
  }
}
run();
