
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Or SERVICE_ROLE if needed, but ANON usually has read access if policies allow

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('games')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching games:', error);
    } else {
        console.log('Sample Game Data:', data);
    }

    // We can't query information_schema easily with supabase-js unless we use rpc or have direct access.
    // But seeing the data format of an existing game will tell us if it returns "2024-..." or "19:00:00"
}

checkSchema();
