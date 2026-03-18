const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data, error } = await supabase.from('games').insert([{
    title: 'Test Error Insertion',
    start_time: new Date().toISOString(),
    event_type: 'standard',
    price: 10,
    max_players: 10,
    surface_type: 'Outdoor Turf',
    location: 'Test Location',
    teams_config: []
  }]);
  
  if (error) {
    console.error('Error Details:', JSON.stringify(error, null, 2));
  } else {
    console.log('Success!', data);
  }
}
run();
