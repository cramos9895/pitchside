const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: profile } = await supabase.from('profiles').select('*').eq('email', 'christian.ramos9895@gmail.com').single();
  console.log('User ID:', profile.id);
  
  const { data: bookings } = await supabase.from('bookings').select('game_id, status').eq('user_id', profile.id);
  console.log('Bookings:', bookings);

  const { data: tourneys } = await supabase.from('tournament_registrations').select('game_id, status').eq('user_id', profile.id);
  console.log('Tournament Regs:', tourneys);
}
check();
