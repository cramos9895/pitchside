const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from('bookings')
        .select('id, user_id, requested_teammate_ids, created_at, team_assignment')
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}
main();
