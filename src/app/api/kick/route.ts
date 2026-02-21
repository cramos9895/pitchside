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

        // 1. Kick the player
        const { error: kickError } = await supabase
            .from('bookings')
            .update({
                status: 'cancelled',
                roster_status: 'dropped',
                payment_status: 'refunded'
            })
            .eq('game_id', gameId)
            .eq('user_id', targetUserId)
            .neq('roster_status', 'dropped');

        if (kickError) throw kickError;

        // 2. Fetch game info for promotion
        const { data: game } = await supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();

        if (!game) throw new Error('Game not found');

        // 3. Count currently confirmed players
        const { count: currentPlayers } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('game_id', gameId)
            .eq('roster_status', 'confirmed');

        // 4. If space opened up, promote someone from waitlist
        if (currentPlayers !== null && currentPlayers < game.max_players) {
            const { data: waitlistedBookings } = await supabase
                .from('bookings')
                .select(`
                    id,
                    user_id,
                    profiles:user_id(email, full_name)
                `)
                .eq('game_id', gameId)
                .eq('roster_status', 'waitlisted')
                .order('created_at', { ascending: true }) // Oldest first
                .limit(1);

            const nextInLine = waitlistedBookings?.[0];

            if (nextInLine) {
                // Promote them!
                const { error: promoteError } = await supabase
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
                            await sendNotification({
                                to: promotedUser.email,
                                subject: `You're in! Spot opened for ${game.title}`,
                                react: GameConfirmation({
                                    userName: promotedUser.full_name || 'Player',
                                    eventName: game.title,
                                    date: new Date(game.start_time).toLocaleString(),
                                    location: game.location
                                }),
                                type: 'waitlist'
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
        console.error('Kick logic error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
