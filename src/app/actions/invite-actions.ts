'use server';

import { isLeagueLocked } from '@/lib/league-utils';

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

    // 0. System Lock Check (MUST occur before any action)
    const { data: gameInfo } = await supabase
        .from('games')
        .select('accepting_registrations, registration_cutoff, roster_lock_date')
        .eq('id', tournamentId)
        .single();
    
    if (gameInfo && isLeagueLocked(gameInfo)) {
        throw new Error("This league is locked. Registration and team joins are closed.");
    }

    // 1. Dual-Participation Check (Improved for Re-joining)
    // We only block if they have an ACTIVE registration. 
    // If they were 'cancelled', we allow the UPSERT to overwrite it.
    const { data: activeReg } = await supabase
        .from('tournament_registrations')
        .select('id, status')
        .eq('user_id', user.id)
        .or(`game_id.eq.${tournamentId},league_id.eq.${tournamentId}`)
        .neq('status', 'cancelled')
        .maybeSingle();

    if (activeReg) {
        throw new Error("You are already an active participant in this tournament/league.");
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
    const { data: gameCheck } = await supabase.from('games').select('id').eq('id', tournamentId).maybeSingle();
    const isGame = !!gameCheck;

    // 4. Register Player (Strict UPSERT logic)
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

    // Use Upsert with onConflict to handle re-registrations gracefully
    const { error: regError } = await supabase
        .from('tournament_registrations')
        .upsert(regPayload, { 
            onConflict: isGame ? 'game_id,user_id' : 'league_id,user_id',
            ignoreDuplicates: false 
        });

    if (regError) {
        console.error("Invite Registration Error:", regError);
        throw new Error("Failed to join team roster. You may already be registered.");
    }

    if (regError) {
        console.error("Invite Registration Error:", regError);
        throw new Error("Failed to join team roster.");
    }

    revalidatePath('/dashboard');
    revalidatePath(`/tournaments/${tournamentId}/team/${teamId}`);
    
    return { success: true };
}
