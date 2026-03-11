const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
async function run() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const env = envFile.split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key] = val;
    return acc;
  }, {});
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Fetch all games with their configs
  const { data: games } = await supabase.from('games').select('id, teams_config');
  
  if (!games) {
    console.log('No games found');
    return;
  }

  // Fetch all bad bookings
  const { data: bookings } = await supabase.from('bookings').select('id, team_assignment, game_id');
  
  if (!bookings || bookings.length === 0) {    
    return;
  }

  const badBookings = bookings.filter(b => b.team_assignment && ['1', '2', '3', '4', '5', '6', '7'].includes(b.team_assignment.toString()));
  
  console.log('Found', badBookings.length, 'bad bookings! Fixing...');
  
  let fixes = 0;
  for (const b of badBookings) {
    const game = games.find(g => g.id === b.game_id);
    if (!game || !game.teams_config) continue;
    
    // Convert '1' -> index 0
    const idx = parseInt(b.team_assignment, 10) - 1;
    const config = game.teams_config[idx];
    
    if (config && config.name) {
      // Update!
      await supabase.from('bookings').update({ team_assignment: config.name }).eq('id', b.id);
      fixes++;
    }
  }
  
  console.log('Fixed', fixes, 'bookings back into strings!');
}
run();
