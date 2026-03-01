
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // refreshing the auth token
    const { data: { user } } = await supabase.auth.getUser()

    // 0. Verification Gatekeeper Check
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, system_role, verification_status')
            .eq('id', user.id)
            .single()

        const path = request.nextUrl.pathname;
        const isAuthRoute = path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/auth');

        // If pending, they can ONLY access /pending or auth routes
        if (profile?.verification_status === 'pending') {
            if (path !== '/pending' && !isAuthRoute) {
                return NextResponse.redirect(new URL('/pending', request.url))
            }
        }
        // If verified, they shouldn't be stuck on /pending
        else if (profile?.verification_status === 'verified') {
            if (path === '/pending') {
                return NextResponse.redirect(new URL('/', request.url))
            }
        }

        // 0.5 Protected Routes Check
        if (request.nextUrl.pathname.startsWith('/update-password')) {
            return supabaseResponse; // Handled implicitly since user exists
        }

        // 0.7 Default Portal Redirect
        if (path === '/') {
            if (profile?.system_role === 'facility_admin') {
                return NextResponse.redirect(new URL('/facility', request.url))
            }
        }

        if (request.nextUrl.pathname.startsWith('/admin')) {

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            // 1. General Admin Access: Must be 'admin' OR 'master_admin'
            if (profile?.role !== 'admin' && profile?.role !== 'master_admin') {
                // Check if they are a 'Host' for a specific game
                const match = request.nextUrl.pathname.match(/^\/admin\/games\/([a-zA-Z0-9-]+)$/);
                let isHost = false;
                if (match && user) {
                    const gameId = match[1];
                    const { data: game } = await supabase
                        .from('games')
                        .select('host_ids')
                        .eq('id', gameId)
                        .single();

                    if (game?.host_ids && game.host_ids.includes(user.id)) {
                        isHost = true;
                    }
                }

                if (!isHost) {
                    return NextResponse.redirect(new URL('/', request.url))
                }
            }

            // 2. Master Admin Only Access: /admin/users or /admin/settings
            if (request.nextUrl.pathname.startsWith('/admin/users') || request.nextUrl.pathname.startsWith('/admin/settings')) {
                if (profile?.role !== 'master_admin') {
                    return NextResponse.redirect(new URL('/admin', request.url)) // Redirect to Dashboard
                }
            }
        }

    }

    return supabaseResponse
}
