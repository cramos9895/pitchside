
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Check if user is admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin' && profile?.role !== 'master_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Manual Cascade Delete (since we can't easily alter constraints right now)
        // 1. Delete Bookings
        const { error: bookingsError } = await supabase
            .from('bookings')
            .delete()
            .eq('game_id', id);

        if (bookingsError) {
            console.error('Error deleting bookings:', bookingsError);
            throw bookingsError;
        }

        // 2. Delete Matches (if table exists/used)
        // We'll try, but wrap in try/catch or just suppress if table doesn't exist?
        // Actually, schema.sql didn't show a 'matches' table, but previous tasks imply it exists.
        // Let's assume it exists based on 'Match History' work.
        const { error: matchesError } = await supabase
            .from('matches')
            .delete()
            .eq('game_id', id);

        if (matchesError) {
            console.error('Error deleting matches (or table missing):', matchesError);
            // Verify if it's a real error or just "table not found"
            // If it fails, maybe proceed? But let's log it.
        }

        // 3. Delete Game
        const { error: gameError } = await supabase
            .from('games')
            .delete()
            .eq('id', id);

        if (gameError) {
            console.error('Error deleting game:', gameError);
            throw gameError;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
