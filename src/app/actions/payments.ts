'use server';

import { createClient } from '@/lib/supabase/server';

export async function validatePromoCode(code: string, facilityId?: string) {
    const supabase = await createClient();

    // Clean input
    const cleanCode = code.toUpperCase().replace(/\s+/g, '');

    // Depending on context, ensure we look for the exact facility, or global codes.
    let query = supabase
        .from('promo_codes')
        .select('*')
        .eq('code', cleanCode)
        .order('created_at', { ascending: false });

    if (facilityId) {
        // Must strictly match facility rules
        // In this architecture, facility_id IS NOT NULL means it's a rental code.
        query = query.eq('facility_id', facilityId);
    } else {
        // Global Pickup Games rule (facility_id IS NULL)
        query = query.is('facility_id', null);
    }

    const { data: promoCodes, error } = await query;

    if (error) {
        console.error("Promo validation error:", error);
        return { error: 'Failed to validate promo code.' };
    }

    const promo = promoCodes?.[0];

    if (!promo) {
        return { error: 'Invalid or unrecognized promo code.' };
    }

    // Expiration check
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return { error: 'This promo code has expired.' };
    }

    // Usage limit check
    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
        return { error: 'This promo code has reached its usage limit.' };
    }

    // Valid
    return { promo };
}
