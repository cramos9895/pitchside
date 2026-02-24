
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Or SERVICE_ROLE if needed, but ANON usually has read access if policies allow

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    // PostgREST exposes openapi.json which contains table definitions
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
    const spec = await res.json();

    console.log('Resources Table Definition:', JSON.stringify(spec.definitions.resources, null, 2));
}

checkSchema();
