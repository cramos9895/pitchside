
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/lib/email';
import { GameConfirmation } from '@/emails/GameConfirmation';



export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // --- ENFORCER: BAN CHECK ---
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_banned, banned_until')
            .eq('id', user.id)
            .single();

        if (profile) {
            if (profile.is_banned) {
                return NextResponse.json({ error: 'Your account has been permanently suspended.' }, { status: 403 });
            }
            if (profile.banned_until && new Date(profile.banned_until) > new Date()) {
                const date = new Date(profile.banned_until).toLocaleDateString();
                return NextResponse.json({ error: `Your account is temporarily suspended until ${date}.` }, { status: 403 });
            }
        }
        // ---------------------------

        const { gameId, note = '', paymentMethod } = await request.json();

        if (!gameId) {
            return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
        }

        // 1. Fetch Game to verify price, current players and max players
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('price, title, start_time, location, max_players, current_players')
            .eq('id', gameId)
            .single();

        if (gameError || !game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        if (game.price > 0 && !paymentMethod) {
            return NextResponse.json({ error: 'This game is not free. Payment required.' }, { status: 403 });
        }

        // 2. Check if already joined (excluding cancelled)
        const { data: existing } = await supabase
            .from('bookings')
            .select('id, status')
            .eq('game_id', gameId)
            .eq('user_id', user.id)
            .neq('status', 'cancelled') // Ignore cancelled bookings
            .single();

        if (existing) {
            return NextResponse.json({ success: true, message: 'Already joined' });
        }

        // 3. Determine Status based on Waitlist logic
        const isFull = game.current_players >= game.max_players;
        const isManualPayment = !!paymentMethod;

        let initialStatus = 'paid'; // Legacy status
        let initialPaymentStatus = isManualPayment ? 'pending' : 'verified';

        if (isFull) {
            initialPaymentStatus = 'unpaid';
            initialStatus = 'waitlist'; // keep legacy status in sync
        }

        const { error: insertError } = await supabase
            .from('bookings')
            .insert({
                user_id: user.id,
                game_id: gameId,
                status: initialStatus, // Legacy
                payment_status: initialPaymentStatus,
                payment_method: paymentMethod || 'free',
                payment_amount: isManualPayment ? game.price : 0,
                checked_in: false,
                team_assignment: null,
                note: note // Store request note
            });



        if (insertError) {
            throw insertError;
        }

        // 4. Sync Player Count (Handled by DB Trigger now)
        // await syncPlayerCount(gameId);

        // 5. Send Confirmation Email
        await sendNotification({
            to: user.email!,
            subject: `Booking Confirmed: ${game.title}`,
            react: GameConfirmation({
                userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player',
                eventName: game.title,
                date: new Date(game.start_time).toLocaleString(),
                location: game.location
            }),
            type: 'confirmation'
        });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('Free Join Error:', err);
        return NextResponse.json({ error: err.message || err.toString() || 'Internal Server Error' }, { status: 500 });
    }
}
