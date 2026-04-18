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
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_banned, banned_until, full_name, credit_balance')
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

        const { gameId, note = '', paymentMethod, promoCodeId, teamAssignment, prizeSplitPreference, guestIds = [] } = await request.json();

        if (!gameId) {
            return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
        }

        // 1. Fetch Game to verify price, current players and max players
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('price, title, start_time, location, max_players, current_players, view_mode, teams_config')
            .eq('id', gameId)
            .single();

        if (gameError || !game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        if (game.price > 0 && !paymentMethod) {
            return NextResponse.json({ error: 'This game is not free. Payment required.' }, { status: 403 });
        }

        // Stripe payments must go through /api/checkout → /success (hosted checkout flow)
        if (paymentMethod === 'stripe') {
            return NextResponse.json({ error: 'Stripe payments must use the hosted checkout flow.' }, { status: 400 });
        }

        // --- ENFORCER: SQUAD CAPACITY CHECK ---
        if (teamAssignment !== undefined && teamAssignment !== null && game.teams_config && Array.isArray(game.teams_config)) {
            const teamConfig = game.teams_config.find((t: any) => t.name === teamAssignment);

            if (teamConfig && teamConfig.limit && teamConfig.limit > 0) {
                const maxPerTeam = teamConfig.limit;

                const adminSupabase = createAdminClient();
                const { count } = await adminSupabase
                    .from('bookings')
                    .select('*', { count: 'exact', head: true })
                    .eq('game_id', gameId)
                    .neq('status', 'cancelled')
                    .eq('team_assignment', teamAssignment);

                if (count !== null && count >= maxPerTeam) {
                    return NextResponse.json({ error: 'This team just filled up! Please select another squad.' }, { status: 400 });
                }
            }
        }
        // --------------------------------------

        // 2. Check if already joined (Recycling Pattern)
        const { data: existing } = await supabase
            .from('bookings')
            .select('id, status')
            .eq('game_id', gameId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (existing && existing.status !== 'cancelled') {
            return NextResponse.json({ success: true, message: 'Already joined' });
        }

        if (existing) {
            return NextResponse.json({ success: true, message: 'Already joined' });
        }

        // 3. Determine Status based on Waitlist logic
        const partySize = 1 + (guestIds?.length || 0);
        const isFull = (game.current_players + partySize) > game.max_players;
        const isManualPayment = !!paymentMethod && paymentMethod !== 'promo';

        let initialStatus = isFull ? 'waitlist' : 'paid'; // Legacy status
        let initialPaymentStatus = isFull ? 'unpaid' : (isManualPayment ? 'pending' : 'verified');

        const adminSupabase = createAdminClient();

        // 4. Wallet Math Integration (Mirroring Stripe Flow)
        let appliedCreditUnits = 0;
        if (!isFull && game.price > 0 && isManualPayment) {
            const subtotalUnits = game.price * partySize;
            const walletBalanceCredits = (profile?.credit_balance || 0) / 100;
            
            appliedCreditUnits = Math.min(walletBalanceCredits, subtotalUnits);
            
            if (appliedCreditUnits > 0) {
                const newBalanceCents = Math.round((walletBalanceCredits - appliedCreditUnits) * 100);
                await adminSupabase.from('profiles').update({ credit_balance: newBalanceCents }).eq('id', user.id);
            }
        }

        // 5. Generate a generic UUID to cluster this squad transaction together if it's a squad edit
        const linkedBookingId = crypto.randomUUID();

        // 6. Perform Atomic Batch Insert Using Admin Client to bypass guest RLS
        const insertPayload: any[] = [
            {
                user_id: user.id,
                game_id: gameId,
                status: initialStatus,
                payment_status: initialPaymentStatus,
                payment_method: paymentMethod || 'free',
                payment_amount: isManualPayment ? game.price : 0,
                checked_in: false,
                team_assignment: teamAssignment !== undefined ? teamAssignment : null,
                note: note,
                linked_booking_id: linkedBookingId
            }
        ];

        for (const guestId of guestIds) {
            insertPayload.push({
                user_id: guestId,
                buyer_id: user.id, // Grouping relationship
                game_id: gameId,
                status: initialStatus,
                payment_status: initialPaymentStatus,
                payment_method: paymentMethod || 'free',
                payment_amount: isManualPayment ? game.price : 0,
                checked_in: false,
                team_assignment: teamAssignment !== undefined ? teamAssignment : null,
                linked_booking_id: linkedBookingId
            });
        }

        // 6. Perform Atomic Batch UPSERT Using Admin Client to recycle rows
        for (const passenger of insertPayload) {
            const { data: existingRow } = await adminSupabase
                .from('bookings')
                .select('id')
                .eq('game_id', passenger.game_id)
                .eq('user_id', passenger.user_id)
                .maybeSingle();

            if (existingRow) {
                const { error: updateError } = await adminSupabase
                    .from('bookings')
                    .update({
                        ...passenger,
                        status: passenger.status,
                        payment_status: passenger.payment_status,
                        team_assignment: passenger.team_assignment,
                        note: passenger.note,
                        linked_booking_id: passenger.linked_booking_id
                    })
                    .eq('id', existingRow.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await adminSupabase
                    .from('bookings')
                    .insert([passenger]);
                if (insertError) throw insertError;
            }
        }

        // 4. Sync Player Count (Handled by DB Trigger now)
        // await syncPlayerCount(gameId);

        // 4.5. Log Promo Code Usage
        if (promoCodeId) {
            const adminSupabase = createAdminClient();
            const { data: currentPromo } = await adminSupabase
                .from('promo_codes')
                .select('current_uses')
                .eq('id', promoCodeId)
                .single();

            if (currentPromo) {
                await adminSupabase
                    .from('promo_codes')
                    .update({ current_uses: currentPromo.current_uses + 1 })
                    .eq('id', promoCodeId);
                console.log(`[JOIN_API] Incremented usage for promo code ${promoCodeId}`);
            }
        }

        // 5. Send Confirmation Email
        try {
            await sendNotification({
                to: user.email!,
                subject: `Booking Confirmed: ${game.title}`,
                type: 'confirmation',
                data: {
                    userName: profile?.full_name || user.email?.split('@')[0] || 'Player',
                    gameTitle: game.title,
                    gameDate: new Date(game.start_time).toLocaleDateString(),
                    gameTime: new Date(game.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    location: game.location || 'TBD',
                    mode: game.view_mode || 'Single Match',
                    amountCharged: game.price > 0 ? `$${game.price.toFixed(2)}` : 'Free'
                }
            });
        } catch (emailErr) {
            console.error('Email Dispatch Error:', emailErr);
            // Don't fail the booking if email fails
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('Free Join Error:', err);
        return NextResponse.json({ error: err.message || err.toString() || 'Internal Server Error' }, { status: 500 });
    }
}
