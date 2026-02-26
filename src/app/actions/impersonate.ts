'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const IMPERSONATE_COOKIE_NAME = 'pitchside_impersonate_facility_id';

export async function enterGodMode(facilityId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Unauthorized' };
    }

    // Verify Super Admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('system_role, role')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.system_role === 'super_admin' || profile?.role === 'master_admin';

    if (!isSuperAdmin) {
        return { error: 'Forbidden. Master Admin rights required to impersonate facilities.' };
    }

    // Set HTTP-Only Cookie
    const cookieStore = await cookies();
    cookieStore.set({
        name: IMPERSONATE_COOKIE_NAME,
        value: facilityId,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 // 24 hours
    });

    // Seamlessly redirect them directly into the target Facility Portal
    redirect('/facility');
}

export async function exitGodMode() {
    // Delete the cookie
    const cookieStore = await cookies();
    cookieStore.delete(IMPERSONATE_COOKIE_NAME);

    // Send them back to the Global Admin Facilities list
    redirect('/admin/facilities');
}
