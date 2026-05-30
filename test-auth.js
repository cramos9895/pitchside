const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test'
);
supabase.auth.onAuthStateChange((event, session) => {
  console.log("Event fired:", event);
});
