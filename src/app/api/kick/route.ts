import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { sendPitchSideEmail } from '@/lib/emails/sendEmail';
import { WaitlistAlertEmail } from '@/emails/WaitlistAlertEmail';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify Admin execution rights
        const { data: adminProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (adminProfile?.role !== 'admin' && adminProfile?.role !== 'master_admin') {
            return NextResponse.json({ error: 'Forbidden. Admin rights required.' }, { status: 403 });
        }

        const { gameId, targetUserId } = await request.json();

        if (!gameId || !targetUserId) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // 1. Kick the player using Admin Client to bypass strict Booking RLS
        const supabaseAdmin = await createAdminClient();
        const { error: kickError } = await supabaseAdmin
            .from('bookings')
            .update({
                status: 'cancelled',
                roster_status: 'dropped',
                payment_status: 'refunded'
            })
            .eq('game_id', gameId)
            .eq('user_id', targetUserId)
            .neq('status', 'cancelled');

        if (kickError) throw kickError;

        // 2. Fetch game info for promotion
        const { data: game, error: gameError } = await supabase
            .from('games')
            .select('start_time, max_players, title, location')
            .eq('id', gameId)
            .single();

        if (gameError || !game) throw new Error('Game not found');

        // 3. Count currently confirmed players (handle legacy 'paid'/'active')
        const { count: currentPlayers } = await supabaseAdmin
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('game_id', gameId)
            .neq('status', 'cancelled')
            .neq('status', 'waitlist')
            .not('roster_status', 'eq', 'dropped')
            .not('roster_status', 'eq', 'waitlisted');

        // 4. If space opened up, promote someone from waitlist
        if (currentPlayers !== null && currentPlayers < game.max_players) {
            const { data: waitlistedBookings } = await supabaseAdmin
                .from('bookings')
                .select(`
                    id,
                    user_id,
                    profiles:user_id(email, full_name)
                `)
                .eq('game_id', gameId)
                .or('roster_status.eq.waitlisted,status.eq.waitlist')
                .order('created_at', { ascending: true }) // Oldest first
                .limit(1);

            const nextInLine = waitlistedBookings?.[0];

            if (nextInLine) {
                // Promote them!
                const { error: promoteError } = await supabaseAdmin
                    .from('bookings')
                    .update({
                        roster_status: 'confirmed',
                        status: 'paid', // Update legacy status
                        // Note: Depending on payment model, we leave payment_status alone.
                        // They will owe money upon arrival or we send them Venmo instructions.
                    })
                    .eq('id', nextInLine.id);

                if (!promoteError) {
                    // Send Email Notification
                    const promotedUser = Array.isArray(nextInLine.profiles)
                        ? nextInLine.profiles[0]
                        : nextInLine.profiles;

                    if (promotedUser?.email) {
                        try {
                            await sendPitchSideEmail({
                                to: promotedUser.email,
                                subject: `You're in! Spot opened for ${game.title}`,
                                react: WaitlistAlertEmail({
                                    gameDate: new Date(game.start_time).toLocaleDateString(),
                                    time: new Date(game.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    location: game.location || 'TBD',
                                    claimUrl: `https://www.pitchsidecf.com/games/${gameId}`
                                })
                            });
                        } catch (emailErr) {
                            console.error('Waitlist promotion email failed:', emailErr);
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('[KICK ERROR]:', err);
        return NextResponse.json({ error: err.message || 'Internal server error', details: err }, { status: 500 });
    }
}
