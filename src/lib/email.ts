import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';


interface SendNotificationProps {
    to: string;
    subject: string;
    react?: React.ReactElement;
    template?: {
        id: string;
        variables: Record<string, any>;
    };
    type: 'welcome' | 'confirmation' | 'cancellation' | 'waitlist' | 'chat_alert' | 'new_request' | 'contract_ready' | 'booking_receipt' | 'booking_cancellation' | 'team_invite' | 'waitlist_promotion' | 'password_reset' | 'captain_receipt' | 'role_elevation';
    data?: Record<string, any>;
}

const TEMPLATE_MAP: Record<string, string> = {
    'welcome': 'auth-welcome',
    'confirmation': 'registration-confirmed',
    'cancellation': 'registration-cancelled',
    'waitlist': 'waitlist-joined',
    'waitlist_promotion': 'waitlist-promoted',
    'password_reset': 'auth-password-reset',
    'captain_receipt': 'transactional-captain-receipt',
    'team_invite': 'team-invite',
    'booking_receipt': 'transactional-booking-receipt',
    'booking_cancellation': 'transactional-booking-cancellation',
    'chat_alert': 'transactional-chat-notification',
    'new_request': 'admin-new-request',
    'contract_ready': 'rental-contract-ready'
};

export async function sendNotification({ to, subject, react, template, type, data }: SendNotificationProps) {
    console.log(`[DEBUG_EMAIL] Starting sendNotification for ${type} to ${to}`);

    // 1. Global Kill Switch
    // Only block if explicitly set to 'false'. Default to true for ease of use.
    if (process.env.ENABLE_EMAILS === 'false') {
        console.log(`🚫 [Mock] Notification (${type}):`, { to, subject });
        return { success: true, data: null };
    }

    // 2. Check API Key
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error("❌ [DEBUG_EMAIL] Resend API Key is missing. Email skipped.");
        return { success: false, error: "Missing RESEND_API_KEY" };
    }

    const resend = new Resend(apiKey);

    try {
        const supabase = await createClient();

        // 3. Check Admin Setting
        const settingKey = `notification.${type}`;
        console.log(`[DEBUG_EMAIL] Checking system_setting: ${settingKey}`);
        
        const { data: setting, error: settingError } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', settingKey)
            .single();

        if (settingError) {
            console.error(`❌ [DEBUG_EMAIL] Error fetching setting ${settingKey}:`, settingError);
        }

        const isEnabled = setting?.value === true || setting?.value === 'true';
        console.log(`[DEBUG_EMAIL] Setting value for ${settingKey}:`, setting?.value, "-> isEnabled:", isEnabled);

        if (!isEnabled) {
            console.log(`🔕 [Blocked by Admin Setting] Notification (${type}):`, { to, subject });
            return { success: true, skipped: true };
        }

        // 4. Send Email via Template or React
        
        const payload: any = {
            from: 'PitchSide Team <support@pitchsidecf.com>',
            to,
            subject,
        };

        if (template) {
            console.log(`[DEBUG_EMAIL] Using explicit template: ${template.id}`);
            payload.template = template;
        } else if (TEMPLATE_MAP[type]) {
            console.log(`[DEBUG_EMAIL] Using TEMPLATE_MAP for ${type}: ${TEMPLATE_MAP[type]}`);
            payload.template = {
                id: TEMPLATE_MAP[type],
                variables: data || {}
            };
        } else if (react) {
            console.log(`[DEBUG_EMAIL] Using React component`);
            payload.react = react;
        } else {
            console.error(`❌ [DEBUG_EMAIL] No template or react component provided for ${type}`);
            return { success: false, error: "Missing template or react component" };
        }

        console.log(`[DEBUG_EMAIL] Final Payload template ID:`, payload.template?.id);
        console.log(`[DEBUG_EMAIL] Variables:`, JSON.stringify(payload.template?.variables));

        const { data: resendData, error } = await resend.emails.send(payload);

        if (error) {
            console.error("❌ [DEBUG_EMAIL] Resend Send Error:", JSON.stringify(error, null, 2));
            return { success: false, error };
        }

        console.log(`✅ [DEBUG_EMAIL] Email sent successfully! ID:`, resendData?.id);
        return { success: true, data: resendData };
    } catch (error) {
        console.error("❌ [DEBUG_EMAIL] Email Exception:", error);
        return { success: false, error };
    }
}
