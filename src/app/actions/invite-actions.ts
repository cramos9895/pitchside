'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-01-28.clover',
});

export async function acceptTeamInvite({
    teamId,
    tournamentId,
    setupIntentId,
    waiverAccepted
}: {
    teamId: string,
    tournamentId: string,
    setupIntentId?: string,
    waiverAccepted: boolean
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized: Please log in to join the team.");
    }

    if (!waiverAccepted) {
        throw new Error("You must accept the liability waiver.");
    }

    // 1. Dual-Role Check (Same as registerTournamentTeam)
    const { data: existingReg } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('user_id', user.id)
        .or(`game_id.eq.${tournamentId},league_id.eq.${tournamentId}`)
        .single();

    if (existingReg) {
        throw new Error("You are already registered for this tournament/league.");
    }

    // 2. Stripe Validation (if split-pay)
    let paymentStatus = 'free_join';
    if (setupIntentId) {
        try {
            const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
            if (setupIntent.status !== 'succeeded') {
                throw new Error("Payment method authorization failed.");
            }
            paymentStatus = 'card_saved';
        } catch (err: any) {
            console.error('Stripe Verification Error:', err.message);
            throw new Error("Could not verify payment method.");
        }
    }

    // 3. Determine if Game or League
    const { data: gameCheck } = await supabase.from('games').select('id').eq('id', tournamentId).single();
    const isGame = !!gameCheck;

    // 4. Register Player
    const regPayload: any = {
        user_id: user.id,
        team_id: teamId,
        status: 'registered',
        role: 'player',
        payment_status: paymentStatus,
        stripe_setup_intent_id: setupIntentId || null
    };

    if (isGame) {
        regPayload.game_id = tournamentId;
    } else {
        regPayload.league_id = tournamentId;
    }

    const { error: regError } = await supabase
        .from('tournament_registrations')
        .insert([regPayload]);

    if (regError) {
        console.error("Invite Registration Error:", regError);
        throw new Error("Failed to join team roster.");
    }

    revalidatePath('/dashboard');
    revalidatePath(`/tournaments/${tournamentId}/team/${teamId}`);
    
    return { success: true };
}
