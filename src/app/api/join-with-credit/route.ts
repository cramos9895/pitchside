import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/lib/email';



export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // --- ENFORCER: BAN CHECK & PROFILE FETCH ---
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('is_banned, banned_until, full_name')
            .eq('id', user.id)
            .single();

        if (userProfile) {
            if (userProfile.is_banned) {
                return NextResponse.json({ error: 'Your account has been permanently suspended.' }, { status: 403 });
            }
            if (userProfile.banned_until && new Date(userProfile.banned_until) > new Date()) {
                const date = new Date(userProfile.banned_until).toLocaleDateString();
                return NextResponse.json({ error: `Your account is temporarily suspended until ${date}.` }, { status: 403 });
            }
        }
        // ---------------------------

        const body = await request.json();
        const { gameId, note } = body;

        if (!gameId) {
            return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
        }

        // 1. Fetch User Profile to check credits
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('free_game_credits')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        if ((profile.free_game_credits || 0) < 1) {
            return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 });
        }

        // 2. Fetch Game to check availability
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('title, start_time, location, view_mode, max_players, current_players, price, status')
            .eq('id', gameId)
            .single();

        if (gameError || !game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        if (game.status === 'cancelled') {
            return NextResponse.json({ error: 'Game is cancelled' }, { status: 400 });
        }

        if (game.current_players >= game.max_players) {
            return NextResponse.json({ error: 'Game is full' }, { status: 400 });
        }

        // 3. Deduct Credit
        const { error: deductionError } = await supabase
            .from('profiles')
            .update({ free_game_credits: profile.free_game_credits - 1 })
            .eq('id', user.id);

        if (deductionError) throw deductionError;

        // 4. Insert Booking (Status: Paid)
        const { error: bookingError } = await supabase
            .from('bookings')
            .insert({
                game_id: gameId,
                user_id: user.id,
                status: 'paid',
                payment_status: 'verified',
                payment_method: 'credit',
                payment_amount: 0,
                item_desc: 'Redeemed MVP Credit', // Optional metadata if schema allows
                note: note
            });

        if (bookingError) {
            // Rollback credit if booking fails (simple rollback)
            await supabase
                .from('profiles')
                .update({ free_game_credits: profile.free_game_credits }) // Restore original
                .eq('id', user.id);
            throw bookingError;
        }

        // 5. Update Player Count (Trigger might handle this, but sync is safer if trigger absent)
        // Trigger `on_booking_change` should handle it.

        try {
            await sendNotification({
                to: user.email!,
                subject: `Booking Confirmed: ${game.title}`,
                type: 'confirmation',
                data: {
                    userName: userProfile?.full_name || user.email?.split('@')[0] || 'Player',
                    gameTitle: game.title,
                    gameDate: new Date(game.start_time).toLocaleDateString(),
                    gameTime: new Date(game.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    location: game.location || 'TBD',
                    mode: game.view_mode || 'Single Match',
                    amountCharged: 'Redeemed Credit'
                }
            });
        } catch (emailErr) {
            console.error('Email Dispatch Error:', emailErr);
            // Don't fail the booking if email fails
        }

        return NextResponse.json({ success: true, message: 'Joined with Credit!' });

    } catch (error: any) {
        console.error('Join with Credit Error:', error);
        return NextResponse.json({ error: error.message || error.toString() || 'Internal Server Error' }, { status: 500 });
    }
}
