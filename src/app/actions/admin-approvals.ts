'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Approve a pending user account.
 * Updates verification_status to 'verified'.
 */
export async function approveUser(userId: string) {
    const supabase = await createClient();

    // Verify the caller is a master admin or super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: callerProfile } = await supabase
        .from('profiles')
        .select('role, system_role')
        .eq('id', user.id)
        .single();

    if (callerProfile?.role !== 'master_admin' && callerProfile?.system_role !== 'super_admin') {
        throw new Error("Unauthorized: Only Master Admins can approve accounts.");
    }

    // Update the pending user
    const { error } = await supabase
        .from('profiles')
        .update({ verification_status: 'verified' })
        .eq('id', userId);

    if (error) {
        console.error("Error approving user:", error);
        throw new Error("Failed to approve user.");
    }

    // Refresh the requests dashboard
    revalidatePath('/admin/requests');
    // Also refresh the overall users table just in case
    revalidatePath('/admin/users');
}

/**
 * Deny/Reject a pending user account.
 * Updates verification_status to 'rejected'.
 */
export async function denyUser(userId: string) {
    const supabase = await createClient();

    // Verify the caller is a master admin or super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: callerProfile } = await supabase
        .from('profiles')
        .select('role, system_role')
        .eq('id', user.id)
        .single();

    if (callerProfile?.role !== 'master_admin' && callerProfile?.system_role !== 'super_admin') {
        throw new Error("Unauthorized: Only Master Admins can reject accounts.");
    }

    // Update the pending user
    const { error } = await supabase
        .from('profiles')
        .update({ verification_status: 'rejected' })
        .eq('id', userId);

    if (error) {
        console.error("Error rejecting user:", error);
        throw new Error("Failed to reject user.");
    }

    // Refresh the requests dashboard
    revalidatePath('/admin/requests');
    // Also refresh the overall users table just in case
    revalidatePath('/admin/users');
}
