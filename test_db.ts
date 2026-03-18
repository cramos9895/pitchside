import { createClient } from '@supabase/supabase-js';
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function reload() {
  console.log('Attempting to notify PostgREST to reload schema...');
  const { error } = await supabase.rpc('pgrst_watch');
  if (error) {
     console.log('No pgrst_watch RPC found. Usually NOTIFY pgrst does it.');
     // Try a manual query just to trigger activity
     await supabase.from('games').select('amount_of_fields').limit(1);
  }
}
reload();
