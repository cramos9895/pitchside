'use server';

import { createClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/email';

export async function inviteFreeAgent(formData: FormData) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const freeAgentId = formData.get('freeAgentId') as string;
        const bookingGroupId = formData.get('bookingGroupId') as string;
        const gameTitle = formData.get('gameTitle') as string;

        if (!freeAgentId || !bookingGroupId) {
            return { success: false, error: 'Missing required fields' };
        }

        // Fetch captain details
        const { data: captainProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        const captainName = captainProfile?.full_name || 'A Team Captain';

        // Fetch agent details
        const { data: targetProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', freeAgentId)
            .single();

        if (!targetProfile || !targetProfile.email) {
            return { success: false, error: 'Agent profile or email not found' };
        }

        // The Gateway Link
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pitchsidecf.com';
        const inviteLink = `${siteUrl}/invite/${bookingGroupId}`;

        // Fire Email
        const emailSubject = `Draft Notice: You've been invited to play!`;

        await sendNotification({
            to: targetProfile.email,
            subject: emailSubject,
            type: 'team_invite',
            template: {
                id: 'team-invite', // Assuming this matches the template ID in Resend
                variables: {
                    userName: captainName,
                    gameTitle: gameTitle,
                    inviteLink: inviteLink
                }
            }
        });

        return { success: true };
    } catch (err: any) {
        console.error('Invite Free Agent Action Error:', err);
        return { success: false, error: err.message || 'Server Action Failed' };
    }
}
