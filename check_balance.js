const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: user } = await supabase.from('profiles').select('credit_balance').eq('email', 'christian.ramos9895@gmail.com').single();
  console.log(`Current credit_balance: ${user.credit_balance} cents ($${user.credit_balance / 100})`);
}

run();
