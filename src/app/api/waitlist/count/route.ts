import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');

    if (!gameId) {
        return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }

    try {
        const adminSupabase = createAdminClient();
        const { count, error } = await adminSupabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('game_id', gameId)
            .eq('status', 'waitlist');

        if (error) throw error;

        return NextResponse.json({ count });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
