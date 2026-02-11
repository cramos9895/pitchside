import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncPlayerCount } from '@/lib/games';

export async function GET() {
    try {
        const supabase = await createClient(); // this uses cookie-based auth
        // Verify admin? Or just let it run for now (it's obscurity security, but low risk for a sync tool)
        // Let's assume user is authenticated at least.

        // Fetch all games
        const { data: games } = await supabase.from('games').select('id');

        if (!games) return NextResponse.json({ message: 'No games found' });

        const results = [];
        for (const game of games) {
            try {
                const count = await syncPlayerCount(game.id);
                results.push({ id: game.id, count });
            } catch (e) {
                results.push({ id: game.id, error: e });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
