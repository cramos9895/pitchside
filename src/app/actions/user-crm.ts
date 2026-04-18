'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendNotification } from '@/lib/email';

/**
 * Updates a user's role. elevation to master_admin is blocked here and must 
 * go through the OTP flow.
 */
export async function updateUserRole(userId: string, newRole: string) {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) throw new Error("Unauthorized");

    // Elevation to master_admin is handled via requestRoleElevation + verifyRoleElevation
    if (newRole === 'master_admin') {
        throw new Error("Master Admin elevation requires OTP verification.");
    }

    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

    if (error) throw error;
    revalidatePath('/admin/users');
    return { success: true };
}

/**
 * Generates a 6-digit OTP for role elevation and emails it to support.
 */
export async function requestRoleElevation(targetUserId: string) {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) throw new Error("Unauthorized");

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString(); // 15 mins

    // Save to DB for airgapped verification
    const { error: otpError } = await supabase
        .from('otp_verifications')
        .insert({
            admin_id: adminUser.id,
            user_id: targetUserId,
            target_role: 'master_admin',
            code,
            expires_at: expiresAt
        });

    if (otpError) throw otpError;

    // Send Email explicitly to support@pitchsidecf.com
    await sendNotification({
        to: 'support@pitchsidecf.com',
        subject: 'Role Elevation Security Code',
        type: 'role_elevation',
        data: { 
            code,
            adminName: adminUser.email,
            targetUserId 
        }
    });

    return { success: true };
}

/**
 * Verifies the OTP and finalizes the role elevation to master_admin.
 */
export async function verifyRoleElevation(userId: string, code: string) {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) throw new Error("Unauthorized");

    // Check OTP validity
    const { data: otp, error: otpError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('admin_id', adminUser.id)
        .eq('code', code)
        .is('verified_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

    if (otpError || !otp) {
        throw new Error("Invalid or expired code.");
    }

    // Update the Role to master_admin
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'master_admin' })
        .eq('id', userId);

    if (updateError) throw updateError;

    // Mark OTP as verified to prevent reuse
    await supabase
        .from('otp_verifications')
        .update({ verified_at: new Date().toISOString() })
        .eq('id', otp.id);

    revalidatePath('/admin/users');
    return { success: true };
}

/**
 * Manually adjusts a user's Game Credit balance and logs the audit trail.
 */
export async function updateUserCredit(userId: string, amount: number, type: 'add' | 'deduct', reason: string) {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) throw new Error("Unauthorized");

    // Fetch current wallet state
    const { data: profile } = await supabase.from('profiles').select('credit_balance').eq('id', userId).single();
    if (!profile) throw new Error("User not found");

    const adjustmentCents = Math.round(amount * 100);
    const newBalance = type === 'add' 
        ? profile.credit_balance + adjustmentCents 
        : profile.credit_balance - adjustmentCents;

    if (newBalance < 0 && type === 'deduct') {
        throw new Error("Insufficient credit balance.");
    }

    // Update Profile Balance
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ credit_balance: newBalance })
        .eq('id', userId);

    if (updateError) throw updateError;

    // Log the transaction for the CRM history view
    const { error: logError } = await supabase
        .from('credit_transactions')
        .insert({
            user_id: userId,
            admin_id: adminUser.id,
            amount: type === 'add' ? adjustmentCents : -adjustmentCents,
            type,
            reason: reason || 'Manual adjustment by Admin'
        });

    if (logError) console.error("Audit log failed:", logError);

    revalidatePath('/admin/users');
    return { success: true };
}

/**
 * Fetches the recent financial history for a specific user.
 */
export async function getCreditHistory(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) throw error;
    return data;
}
