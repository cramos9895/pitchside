
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Role Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedSettings() {
    console.log('Connecting to Supabase:', supabaseUrl);

    const settings = [
        { key: 'notification.welcome', label: 'Welcome Email', description: 'Sent when a new user signs up.', category: 'notification', value: true },
        { key: 'notification.confirmation', label: 'Game Confirmation', description: 'Sent when a user joins a game.', category: 'notification', value: true },
        { key: 'notification.cancellation', label: 'Cancellation Receipt', description: 'Sent when a user leaves a game.', category: 'notification', value: true },
        { key: 'notification.waitlist', label: 'Waitlist Alert', description: 'Sent to the next user when a spot opens up.', category: 'notification', value: true }
    ];

    console.log('Seeding settings...');

    for (const setting of settings) {
        const { error } = await supabase
            .from('system_settings')
            .upsert(setting, { onConflict: 'key' });

        if (error) {
            console.error(`Failed to seed ${setting.key}:`, error.message);
        } else {
            console.log(`✅ Seeded ${setting.key}`);
        }
    }

    console.log('Verifying settings table...');
    const { data: allSettings, error: fetchError } = await supabase
        .from('system_settings')
        .select('*');

    if (fetchError) {
        console.error('Error fetching settings:', fetchError);
    } else {
        console.log('Current Settings in DB:', allSettings?.length);
        console.table(allSettings);
    }
}

seedSettings();
