const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('games').select('id, title, max_players, current_players, max_waitlist').order('created_at', { ascending: false }).limit(5);
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
