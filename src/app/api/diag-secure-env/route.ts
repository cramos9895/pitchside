
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // ONLY allow the specific user to see this
        if (user?.email !== 'christian.ramos9895@gmail.com') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({
            ENABLE_EMAILS: process.env.ENABLE_EMAILS || 'NOT SET',
            HAS_API_KEY: !!process.env.RESEND_API_KEY,
            API_KEY_SUFFIX: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.slice(-4) : 'N/A',
            NODE_ENV: process.env.NODE_ENV
        });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to run diagnostics' }, { status: 500 });
    }
}
