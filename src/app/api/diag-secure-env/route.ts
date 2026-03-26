import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // ONLY allow the specific user to see this
        if (user?.email !== 'christian.ramos9895@gmail.com') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apiKey = process.env.RESEND_API_KEY;
        let testResult = null;

        if (apiKey) {
            const resend = new Resend(apiKey);
            try {
                const { data, error } = await resend.emails.send({
                    from: 'PitchSide Team <support@pitchsidecf.com>',
                    to: 'christian.ramos9895@gmail.com',
                    subject: 'Live Diagnostic Test',
                    html: '<p>If you see this, the Resend SDK is working in live!</p>'
                });
                testResult = { data, error };
            } catch (err: any) {
                testResult = { error: err.message };
            }
        }

        return NextResponse.json({
            ENABLE_EMAILS: process.env.ENABLE_EMAILS || 'NOT SET',
            HAS_API_KEY: !!apiKey,
            API_KEY_SUFFIX: apiKey ? apiKey.slice(-4) : 'N/A',
            NODE_ENV: process.env.NODE_ENV,
            TEST_RESEND_RESULT: testResult
        });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to run diagnostics' }, { status: 500 });
    }
}
