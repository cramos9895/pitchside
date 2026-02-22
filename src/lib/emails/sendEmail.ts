import { Resend } from 'resend';
import * as React from 'react';

// Initialize the central Resend client using the generic process.env variable
const apiKey = process.env.RESEND_API_KEY;
export const resend = apiKey ? new Resend(apiKey) : null;

interface SendPitchSideEmailProps {
    to: string;
    subject: string;
    react: React.ReactElement;
}

/**
 * A centralized utility wrapper to send React Email templates via Resend.
 * Defaults to the standard Pitch Side generic support address.
 */
export async function sendPitchSideEmail({ to, subject, react }: SendPitchSideEmailProps) {
    if (!resend) {
        console.error("❌ sendPitchSideEmail failed: RESEND_API_KEY is not defined in environment.");
        return { success: false, error: "Missing RESEND_API_KEY" };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Pitch Side <hello@pitchsidecf.com>',
            to,
            subject,
            react,
        });

        if (error) {
            console.error("❌ sendPitchSideEmail delivery error:", error);
            return { success: false, error };
        }

        console.log(`✅ Email sent successfully to ${to} (Subject: ${subject})`);
        return { success: true, data };
    } catch (err: any) {
        console.error("❌ sendPitchSideEmail fatal exception:", err);
        return { success: false, error: err };
    }
}
