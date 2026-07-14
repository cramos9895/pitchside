const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase.from('games').select('id, title, payment_collection_type, team_price, deposit_amount, event_type').eq('league_format', 'rolling').order('created_at', { ascending: false }).limit(2);
    console.log(JSON.stringify(data, null, 2));
}
check();
