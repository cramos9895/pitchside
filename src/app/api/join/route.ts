
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

        const { gameId, note = '', paymentMethod } = await request.json();

        if (!gameId) {
            return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
        }

        // 1. Fetch Game to verify price is 0
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('price, title, start_time, location')
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

        // 3. Insert Booking (Status: paid)
        const isManualPayment = !!paymentMethod;
        const initialStatus = 'paid'; // Manual payments reserve the spot immediately
        const initialPaymentStatus = isManualPayment ? 'pending' : 'verified'; // Free games = verified, Manual = pending

        const { error: insertError } = await supabase
            .from('bookings')
            .insert({
                user_id: user.id,
                game_id: gameId,
                status: initialStatus,
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
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
