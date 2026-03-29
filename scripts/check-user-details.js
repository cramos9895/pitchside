const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDetails() {
  const email = 'christian.ramos9895@gmail.com';
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, credit_balance, free_game_credits')
    .eq('email', email)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError.message);
    return;
  }

  console.log('--- PROFILE ---');
  console.log('ID:', profile.id);
  console.log('Email:', profile.email);
  console.log('Wallet Balance (USD):', (profile.credit_balance || 0) / 100);
  console.log('Free Game Credits:', profile.free_game_credits);

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, status, roster_status, created_at, game_id, buyer_id')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError.message);
  } else {
    console.log('\n--- RECENT BOOKINGS ---');
    bookings.forEach(b => {
      console.log(`ID: ${b.id} | Status: ${b.status} | Roster: ${b.roster_status} | Buyer: ${b.buyer_id} | Created: ${b.created_at}`);
    });
  }
}

checkDetails();
