'use server'

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendNotification } from '@/lib/email';
import { NewRequestEmail } from '@/emails/NewRequestEmail';

export async function submitRefereeApplication(experienceSummary: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Check if they already have a pending application
    const { data: existing } = await supabase
        .from('referee_applications')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

    if (existing) {
        throw new Error("You already have a pending application.");
    }

    const { error } = await supabase
        .from('referee_applications')
        .insert({
            user_id: user.id,
            status: 'pending',
            experience_summary: experienceSummary
        });

    if (error) throw new Error(error.message);

    // Send email notification to master admin
    await sendNotification({
        to: 'support@pitchsidecf.com',
        subject: 'Action Required: New Referee Application',
        type: 'new_request',
        react: NewRequestEmail({
            userName: user.email || 'Unknown User',
            resourceName: 'Referee Application',
            requestedDates: [new Date().toLocaleDateString()]
        })
    }).catch(console.error); // Catch but don't throw to not break the UI flow

    revalidatePath('/settings');
    revalidatePath('/admin/requests');
    
    return { success: true };
}

export async function approveRefereeApplication(applicationId: string, userId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Verify caller is master admin
    const { data: adminProfile } = await supabase.from('profiles').select('role, system_role').eq('id', user.id).single();
    if (adminProfile?.role !== 'master_admin' && adminProfile?.system_role !== 'super_admin') {
        throw new Error("Unauthorized: Only Master Admins can approve applications.");
    }

    // 1. Update application status
    const { error: appError } = await supabase
        .from('referee_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);
        
    if (appError) throw new Error(appError.message);

    // 2. Elevate user to referee
    const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'referee' })
        .eq('id', userId);

    if (profileError) throw new Error(profileError.message);

    revalidatePath('/admin/requests');
    revalidatePath('/settings');
    
    return { success: true };
}

export async function rejectRefereeApplication(applicationId: string, reason: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Verify caller is master admin
    const { data: adminProfile } = await supabase.from('profiles').select('role, system_role').eq('id', user.id).single();
    if (adminProfile?.role !== 'master_admin' && adminProfile?.system_role !== 'super_admin') {
        throw new Error("Unauthorized: Only Master Admins can reject applications.");
    }

    // Update application status and reason
    const { error } = await supabase
        .from('referee_applications')
        .update({ 
            status: 'rejected',
            rejection_reason: reason
        })
        .eq('id', applicationId);
        
    if (error) throw new Error(error.message);

    revalidatePath('/admin/requests');
    revalidatePath('/settings');
    
    return { success: true };
}
