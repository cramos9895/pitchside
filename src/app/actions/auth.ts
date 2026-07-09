// 🏗️ Architecture: [[SignUpForm.md]]

'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isRateLimited } from '@/lib/security/rate-limit';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { sendNotification } from '@/lib/email';
import { NewRequestEmail } from '@/emails/NewRequestEmail';

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
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const accountType = formData.get('accountType') as 'player' | 'facility' | 'referee';
    
    // Optional / Persona Specific
    const dob = formData.get('dob') as string;
    const phone = formData.get('phone') as string;
    const zip = formData.get('zip') as string;
    const organizationName = formData.get('organizationName') as string;
    const jobTitle = formData.get('jobTitle') as string;
    const certLevel = formData.get('certLevel') as string;
    const primarySportsJson = formData.get('primarySports') as string;
    let primarySports: string[] = [];
    try {
        if (primarySportsJson) {
            primarySports = JSON.parse(primarySportsJson);
        }
    } catch (e) {
        console.error("Error parsing primarySports:", e);
    }

    if (!email || !password || !firstName || !lastName) {
        return { error: 'Missing required base fields.' };
    }

    // 1. Sign up the user via standard Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { 
                first_name: firstName,
                last_name: lastName,
                dob,
                phone_number: phone,
                zip_code: zip,
                organization_name: organizationName,
                job_title: jobTitle,
                certification_level: certLevel,
                primary_sports: primarySports,
                role: accountType === 'referee' ? 'referee' : 'player',
                system_role: accountType === 'facility' ? 'facility_admin' : 'player'
            }
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

        // Notify Master Admin
        await sendNotification({
            to: 'support@pitchsidecf.com',
            subject: 'Action Required: New Facility Sign-Up',
            type: 'new_request',
            react: NewRequestEmail({
                userName: email || 'Unknown User',
                resourceName: `Facility Account (${organizationName})`,
                requestedDates: [new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago' })]
            })
        }).catch(console.error);

    } else if (accountType === 'referee') {
        // Referees are pending until background check/cert verification
        const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({
                role: 'referee',
                verification_status: 'pending'
            })
            .eq('id', userId);

        if (profileUpdateError) {
            console.error("Profile update error:", profileUpdateError);
        } else {
            // Notify Master Admin
            await sendNotification({
                to: 'support@pitchsidecf.com',
                subject: 'Action Required: New Referee Sign-Up',
                type: 'new_request',
                react: NewRequestEmail({
                    userName: email || 'Unknown User',
                    resourceName: 'Referee Account',
                    requestedDates: [new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago' })]
                })
            }).catch(console.error);
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


