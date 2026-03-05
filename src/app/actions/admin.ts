'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function updatePlatformFees(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Unauthorized' };
    }

    // 1. Verify Master Admin Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('system_role, role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.system_role !== 'super_admin' && profile.role !== 'master_admin')) {
        return { error: 'Forbidden. Master Admin privileges required.' };
    }

    const fee_type = formData.get('fee_type') as string;
    const fee_percent_raw = formData.get('fee_percent') as string;
    const fee_fixed_raw = formData.get('fee_fixed') as string;

    if (!['percent', 'fixed', 'both'].includes(fee_type)) {
        return { error: 'Invalid fee type selected.' };
    }

    // 2. Safely parse inputs
    let fee_percent = 0;
    if (fee_percent_raw) {
        const p = parseFloat(fee_percent_raw);
        if (!isNaN(p) && p >= 0) fee_percent = p;
    }

    let fee_fixed = 0;
    if (fee_fixed_raw) {
        const f = parseFloat(fee_fixed_raw);
        if (!isNaN(f) && f >= 0) {
            // Convert to cents
            fee_fixed = Math.round(f * 100);
        }
    }

    const adminSupabase = createAdminClient();

    // 3. Update the singleton row (id = 1)
    const { error } = await adminSupabase
        .from('platform_settings')
        .update({
            fee_type,
            fee_percent,
            fee_fixed
        })
        .eq('id', 1);

    if (error) {
        console.error('[SETTINGS_UPDATE_ERROR]', error);
        return { error: 'Failed to update platform settings.' };
    }

    revalidatePath('/admin/settings/financials');
    return { success: true };
}
