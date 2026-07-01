import { createClient } from '@/lib/supabase/server';
import { isRateLimited } from '@/lib/security/rate-limit';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const nextPath = formData.get('next') as string | null;

        // --- SECURITY: RATE LIMITING ---
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        
        // 5 login attempts per 5 minutes per IP
        const isLimited = await isRateLimited(ip, 'action:auth:login', 5, 300);
        if (isLimited) {
            return NextResponse.json({ error: 'Too many login attempts. Please wait 5 minutes.' }, { status: 429 });
        }
        // -------------------------------

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const supabase = await createClient();

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 401 });
        }

        // Role Fetching for redirection
        if (authData?.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, system_role, verification_status')
                .eq('id', authData.user.id)
                .single();

            let destination = '/dashboard';
            
            if (nextPath) {
                destination = nextPath;
            } else if (profile?.verification_status === 'pending') {
                destination = '/pending';
            } else if (profile?.system_role === 'facility_admin' || profile?.system_role === 'super_admin') {
                destination = '/facility';
            } else if (profile?.role === 'referee') {
                destination = '/referee';
            }

            // Next.js Route Handlers naturally return Set-Cookie headers unmodified from createServerClient
            // Returning the URL allows the client-side fetch to cleanly navigate the browser.
            return NextResponse.json({ success: true, url: destination });
        }

        return NextResponse.json({ error: 'Unexpected login error.' }, { status: 500 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Server error occurred' }, { status: 500 });
    }
}
