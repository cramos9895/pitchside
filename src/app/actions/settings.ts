'use server';

import { createClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

export async function getPaymentSettings() {
    noStore(); // Explicitly bypass Next.js cache to always fetch live values
    const supabase = await createClient();

    const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['payment.venmo_handle', 'payment.zelle_info']);

    return data || [];
}
