import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        await supabase.auth.signOut();

        return NextResponse.redirect(new URL('/', request.url), 303);
    } catch (error) {
        console.error('Error in logout route:', error);
        // Even if there's an error, we redirect to home
        return NextResponse.redirect(new URL('/', request.url), 303);
    }
}

// Support GET for direct link logouts if needed
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        await supabase.auth.signOut();

        return NextResponse.redirect(new URL('/', request.url), 303);
    } catch (error) {
        console.error('Error in logout route:', error);
        return NextResponse.redirect(new URL('/', request.url), 303);
    }
}
