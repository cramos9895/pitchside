import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/'

    console.log('[Auth Callback] Processing:', { url: request.url, code: !!code, next, origin });

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            console.log('[Auth Callback] Session Exchanged Successfully');

            const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development'

            const type = searchParams.get('type');
            const finalNext = type === 'recovery' ? '/update-password' : next;

            let redirectUrl;

            if (isLocalEnv) {
                redirectUrl = `${origin}${finalNext}`
            } else if (forwardedHost) {
                redirectUrl = `https://${forwardedHost}${finalNext}`
            } else {
                redirectUrl = `${origin}${finalNext}`
            }

            console.log('[Auth Callback] Redirecting to:', redirectUrl);
            return NextResponse.redirect(redirectUrl)
        } else {
            console.error('[Auth Callback] Exchange Error:', error);
        }
    } else {
        console.warn('[Auth Callback] No code provided');
    }

    // return the user to an error page with instructions
    console.log('[Auth Callback] Redirecting to error page');
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
