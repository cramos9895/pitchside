
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettings() {
    console.log('Checking system_settings...');

    const { data, error } = await supabase
        .from('system_settings')
        .select('*');

    if (error) {
        console.error('Error fetching settings:', error);
    } else {
        console.log('Settings found:', data);
    }

    // List all users and roles
    console.log('\n--- Checking User Roles ---');
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id, email, role, full_name, is_master_admin'); // check is_master_admin column if it exists, or just role

    if (userError) {
        console.error('Error fetching profiles:', userError);
    } else {
        console.table(users);
    }
}

checkSettings();
