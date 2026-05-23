const { createServerClient } = require('@supabase/ssr');
require('dotenv').config({ path: '.env.local' });

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    cookies: {
      getAll() { return []; },
      setAll(cookiesToSet) {
        console.log(JSON.stringify(cookiesToSet, null, 2));
      }
    }
  }
);

async function test() {
  await supabase.auth.setSession({
    access_token: 'fake',
    refresh_token: 'fake',
  });
}
test();
