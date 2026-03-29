const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Key missing from .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCredit() {
  const email = 'christian.ramos9895@gmail.com';
  const { data, error } = await supabase
    .from('profiles')
    .select('email, credit_balance, free_game_credits')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Error fetching profile:', error.message);
  } else {
    console.log('Profile found:');
    console.log('Email:', data.email);
    console.log('Wallet Balance (cents):', data.credit_balance);
    console.log('Wallet Balance (USD):', (data.credit_balance || 0) / 100);
    console.log('Free Game Credits:', data.free_game_credits);
  }
}

checkCredit();
