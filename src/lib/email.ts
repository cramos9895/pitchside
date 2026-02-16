import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendNotificationProps {
    to: string;
    subject: string;
    react: React.ReactElement;
    type: 'welcome' | 'confirmation' | 'cancellation' | 'waitlist';
}

export async function sendNotification({ to, subject, react, type }: SendNotificationProps) {
    // 1. Global Kill Switch
    if (process.env.ENABLE_EMAILS !== 'true') {
        console.log(`🚫 [Mock] Notification (${type}):`, { to, subject });
        return { success: true, data: null };
    }

    try {
        const supabase = await createClient();

        // 2. Check Admin Setting
        const settingKey = `notification.${type}`;
        const { data: setting } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', settingKey)
            .single();

        // Default to true if missing, or handle strictly? 
        // Migration sets default true. If missing, assumes false for safety? 
        // User said: "IF OFF: Log [Blocked by Admin Setting]...".
        // If data is missing (not seeded), maybe block?
        // Let's assume seeded.

        const isEnabled = setting?.value === true || setting?.value === 'true'; // Handle JSONB boolean or string just in case

        if (!isEnabled) {
            console.log(`🔕 [Blocked by Admin Setting] Notification (${type}):`, { to, subject });
            return { success: true, skipped: true };
        }

        // 3. Send Email
        const { data, error } = await resend.emails.send({
            from: 'PitchSide Team <support@pitchsidecf.com>',
            to,
            subject,
            react,
        });

        if (error) {
            console.error("Email Send Error:", error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error("Email Exception:", error);
        return { success: false, error };
    }
}
