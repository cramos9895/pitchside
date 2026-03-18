const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_string: `
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS rules_description text,
      ADD COLUMN IF NOT EXISTS location_nickname text,
      ADD COLUMN IF NOT EXISTS game_format_type text,
      ADD COLUMN IF NOT EXISTS match_style text,
      ADD COLUMN IF NOT EXISTS refund_cutoff_hours integer,
      ADD COLUMN IF NOT EXISTS field_size text,
      ADD COLUMN IF NOT EXISTS shoe_types text[];
    `
  });
  
  if (error) {
    if (error.message.includes('Could not find the function public.exec_sql')) {
      console.log('No exec_sql function found. Will create instructions for manual SQL run.');
    } else {
      console.error('Error:', error);
    }
  } else {
    console.log('Migration successful:', data);
  }
}
run();
