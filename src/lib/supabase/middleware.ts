
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

    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        // 1. General Admin Access: Must be 'admin' OR 'master_admin'
        if (profile?.role !== 'admin' && profile?.role !== 'master_admin') {
            return NextResponse.redirect(new URL('/', request.url))
        }

        // 2. Master Admin Only Access: /admin/users
        if (request.nextUrl.pathname.startsWith('/admin/users')) {
            if (profile?.role !== 'master_admin') {
                return NextResponse.redirect(new URL('/admin', request.url)) // Redirect to Dashboard
            }
        }
    }

    return supabaseResponse
}
