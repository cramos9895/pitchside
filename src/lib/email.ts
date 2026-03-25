import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';


interface SendNotificationProps {
    to: string;
    subject: string;
    react?: React.ReactElement;
    type: 'welcome' | 'confirmation' | 'cancellation' | 'waitlist' | 'chat_alert' | 'new_request' | 'contract_ready' | 'booking_receipt' | 'booking_cancellation' | 'team_invite' | 'waitlist_promotion' | 'password_reset' | 'captain_receipt';
    data?: Record<string, any>;
}

const TEMPLATE_MAP: Record<string, string> = {
    'welcome': 'auth-welcome',
    'confirmation': 'registration-confirmed',
    'cancellation': 'registration-cancelled',
    'waitlist': 'waitlist-joined',
    'waitlist_promotion': 'waitlist-promoted',
    'password_reset': 'auth-password-reset',
    'captain_receipt': 'transactional-captain-receipt'
};

export async function sendNotification({ to, subject, react, type, data }: SendNotificationProps) {
    // 1. Global Kill Switch
    if (process.env.ENABLE_EMAILS !== 'true') {
        console.log(`🚫 [Mock] Notification (${type}):`, { to, subject });
        return { success: true, data: null };
    }

    // 2. Check API Key
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error("❌ Resend API Key is missing. Email skipped.");
        return { success: false, error: "Missing RESEND_API_KEY" };
    }

    const resend = new Resend(apiKey);

    try {
        const supabase = await createClient();

        // 3. Check Admin Setting
        const settingKey = `notification.${type}`;
        const { data: setting } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', settingKey)
            .single();

        const isEnabled = setting?.value === true || setting?.value === 'true';

        if (!isEnabled) {
            console.log(`🔕 [Blocked by Admin Setting] Notification (${type}):`, { to, subject });
            return { success: true, skipped: true };
        }

        // 4. Send Email via Template or React
        const templateId = TEMPLATE_MAP[type];
        
        const payload: any = {
            from: 'PitchSide Team <support@pitchsidecf.com>',
            to,
            subject,
        };

        if (templateId) {
            payload.template = {
                id: templateId,
                variables: data || {}
            };
        } else if (react) {
            payload.react = react;
        } else {
            console.error(`❌ No template or react component provided for ${type}`);
            return { success: false, error: "Missing template or react component" };
        }

        const { data: resendData, error } = await resend.emails.send(payload);

        if (error) {
            console.error("Email Send Error:", JSON.stringify(error, null, 2));
            return { success: false, error };
        }

        return { success: true, data: resendData };
    } catch (error) {
        console.error("Email Exception:", error);
        return { success: false, error };
    }
}
