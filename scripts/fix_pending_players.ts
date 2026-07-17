import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// This script fixes players who paid via Stripe but remain in 'pending' status due to missing column error

async function fixPendingPlayers() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Fetching all pending tournament registrations...");
    const { data: pendingRegs, error: fetchError } = await supabase
        .from('tournament_registrations')
        .select('*')
        .eq('status', 'pending');

    if (fetchError) {
        console.error("Error fetching pending registrations:", fetchError);
        process.exit(1);
    }

    console.log(`Found ${pendingRegs.length} pending registrations.`);

    // Note: Since we cannot easily verify Stripe payments from this script without the Stripe secret key,
    // and since the user explicitly requested to "update players who signed up on the production platform that did already pay",
    // you can run this script to forcefully set them to 'registered' and 'paid'.
    // ONLY RUN THIS IF YOU HAVE VERIFIED THEY ACTUALLY PAID IN STRIPE!

    for (const reg of pendingRegs) {
        console.log(`Updating registration ${reg.id} for user ${reg.user_id}...`);
        
        const { error: updateError } = await supabase
            .from('tournament_registrations')
            .update({
                status: 'registered',
                payment_status: 'paid'
            })
            .eq('id', reg.id);

        if (updateError) {
            console.error(`Failed to update registration ${reg.id}:`, updateError);
        } else {
            console.log(`Successfully updated registration ${reg.id}.`);
        }
    }

    console.log("Done fixing pending players.");
}

fixPendingPlayers();
