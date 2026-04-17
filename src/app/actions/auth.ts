// 🏗️ Architecture: [[SignUpForm.md]]

'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isRateLimited } from '@/lib/security/rate-limit';
import { headers } from 'next/headers';

export async function registerAccount(formData: FormData) {
    // --- SECURITY: RATE LIMITING ---
    // Registration is unauthenticated, so we limit by IP
    const headerList = await headers();
    const forwarded = headerList.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    // 5 account creations per 5 minutes per IP
    const isLimited = await isRateLimited(ip, 'action:auth:register', 5, 300);
    if (isLimited) {
        return { error: 'Too many registration attempts. Please wait 5 minutes.' };
    }
    // -------------------------------

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const accountType = formData.get('accountType') as 'player' | 'facility';
    const organizationName = formData.get('organizationName') as string;

    if (!email || !password || !fullName) {
        return { error: 'Missing required fields.' };
    }

    // 1. Sign up the user via standard Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName }
        }
    });

    if (authError) {
        return { error: authError.message };
    }

    const userId = authData.user?.id;
    if (!userId) {
        return { error: 'Failed to create user account.' };
    }

    // 2. Post-Registration Logic based on Account Type
    if (accountType === 'facility') {
        if (!organizationName) {
            // Rollback if needed in a real app, but for now we just return error
            return { error: 'Organization Name is required for Facility Owners.' };
        }

        // Generate a URL-friendly slug
        const baseSlug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const uniqueSuffix = Math.random().toString(36).substring(2, 8);
        const facilitySlug = `${baseSlug}-${uniqueSuffix}`;

        // Insert Facility
        const { data: newFacility, error: facilityError } = await supabaseAdmin
            .from('facilities')
            .insert([{ name: organizationName, slug: facilitySlug }])
            .select()
            .single();

        if (facilityError) {
            console.error("Facility creation error:", facilityError);
            return { error: 'Failed to create organization profile.' };
        }

        // Elevate user to facility_admin, set them to pending, and link the facility
        const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({
                system_role: 'facility_admin',
                verification_status: 'pending',
                facility_id: newFacility.id
            })
            .eq('id', userId);

        if (profileUpdateError) {
            console.error("Profile update error:", profileUpdateError);
            return { error: 'Failed to assign facility permissions.' };
        }
    } else {
        // Explicitly ensure player type is active
        const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({
                role: 'player',
                verification_status: 'verified'
            })
            .eq('id', userId);

        if (profileUpdateError) {
            console.error("Profile update error:", profileUpdateError);
        }
    }

    return { success: true };
}

export async function loginUser(formData: FormData) {
    // --- SECURITY: RATE LIMITING ---
    const headerList = await headers();
    const forwarded = headerList.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    // 5 login attempts per 5 minutes per IP
    const isLimited = await isRateLimited(ip, 'action:auth:login', 5, 300);
    if (isLimited) {
        return { error: 'Too many login attempts. Please wait 5 minutes.' };
    }
    // -------------------------------

    const supabase = await createClient();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (authError) {
        return { error: authError.message };
    }

    // Role Fetching for redirection
    if (authData?.user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('system_role')
            .eq('id', authData.user.id)
            .single();

        return { 
            success: true, 
            userId: authData.user.id,
            systemRole: profile?.system_role || 'user'
        };
    }

    return { error: 'Unexpected login error.' };
}
