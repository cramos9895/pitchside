'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { v4 as uuidv4 } from 'uuid';

export async function seedTournament(gameId: string) {
    if (process.env.NODE_ENV !== 'development') {
        throw new Error("This utility is strictly for local development testing.");
    }

    const adminSupabase = createAdminClient();

    try {
        // 1. Fetch the Game safely
        const { data: game, error: gameError } = await adminSupabase
            .from('games')
            .select('teams_config, max_players, min_players_per_team, max_teams, min_teams, facility_id')
            .eq('id', gameId)
            .single();
        
        if (gameError || !game) throw new Error("Game not found or invalid.");
        
        let teams = game.teams_config || [];
        
        // --- STEP 1: Generate Dummy Teams if none exist ---
        if (teams.length === 0) {
            // Cap at 10 to ensure we don't spawn empty teams (50 players / 5 per team = 10 max teams)
            const numTeams = Math.min(game.max_teams || game.min_teams || 8, 10);
            console.log(`[SEED] No teams found. Generating ${numTeams} dummy teams...`);
            
            const generatedTeams = [];
            const squadNames = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa'];
            
            for (let i = 0; i < numTeams; i++) {
                generatedTeams.push({
                    name: `Test Squad ${squadNames[i] || i + 1}`,
                    color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
                    limit: game.min_players_per_team || null
                });
            }
            
            // Save them to the database
            const { error: updateError } = await adminSupabase
                .from('games')
                .update({ teams_config: generatedTeams })
                .eq('id', gameId);
                
            if (updateError) {
                console.error("[SEED] Failed to insert dummy teams:", updateError);
                throw new Error("Failed to insert dummy teams.");
            }
            
            teams = generatedTeams;
            console.log("[SEED] Successfully injected dummy teams into game.teams_config:", teams);
        }
        // --------------------------------------------------

        console.log("[SEED] Generating 60 auth users via Supabase Admin...");
        const dummyUsers: string[] = [];
        
        // We do this in batches of 10 to avoid overwhelming local/cloud rate limits.
        for (let batch = 0; batch < 6; batch++) {
            const promises = [];
            for (let i = 0; i < 10; i++) {
                const idx = batch * 10 + i + 1;
                const uniqueStr = Math.random().toString(36).substring(7); // Prevent email collisions on multiple runs
                // create an actual auth user so the DB's profile trigger sets up the FK correctly
                promises.push(
                    adminSupabase.auth.admin.createUser({
                        email: `dummyplayer${idx}_${uniqueStr}@testtournament.com`,
                        password: 'password123',
                        email_confirm: true,
                        user_metadata: {
                            full_name: `Dummy Player ${idx}`,
                            username: `dummy_${idx}_${uniqueStr}`
                        }
                    })
                );
            }
            const results = await Promise.all(promises);
            for (const res of results) {
                if (res.data?.user) {
                    dummyUsers.push(res.data.user.id);
                    // Force an update to the profile to ensure role and phone are set for UI testing
                    await adminSupabase.from('profiles').update({
                        phone: '555-010-0000',
                        skill_level: 'Intermediate',
                        role: 'user'
                    }).eq('id', res.data.user.id);
                } else if (res.error) {
                    console.error("[SEED] Error creating user:", res.error);
                }
            }
        }

        if (dummyUsers.length === 0) {
            throw new Error("Failed to create any dummy users via Auth Admin. Check logs.");
        }
        
        console.log(`[SEED] Successfully created ${dummyUsers.length} authentic dummy users.`);

        // Generate Fake Bookings Flow
        let bookingData: any[] = [];
        let waiverData: any[] = [];
        let playerIndex = 0;

        // Assign ~50 players to Teams
        for (const team of teams) {
            // Give each team exactly 5 players for this test
            for (let i = 0; i < 5; i++) {
                if (playerIndex >= 50) break; // limit team assignments
                const userId = dummyUsers[playerIndex];
                
                const hasSigned = Math.random() > 0.3;
                bookingData.push({
                    game_id: gameId,
                    user_id: userId,
                    status: 'active', // "active" represents a confirmed paid tournament booking
                    payment_status: 'verified', // bypass checkout
                    payment_method: 'free',
                    payment_amount: 0,
                    checked_in: false,
                    team_assignment: team.name,
                    is_captain: i === 0, // Set first player as captain
                    has_signed: hasSigned,
                    is_winner: false
                });

                if (hasSigned) {
                    waiverData.push({ user_id: userId, facility_id: game.facility_id || null });
                }

                playerIndex++;
            }
        }

        // The remaining 10 users (from index 50 to 59) will be FREE AGENTS
        while (playerIndex < 60) {
            const userId = dummyUsers[playerIndex];
            const hasSigned = Math.random() > 0.3;
            bookingData.push({
                game_id: gameId,
                user_id: userId,
                status: 'active',
                payment_status: 'verified',
                payment_method: 'free',
                payment_amount: 0,
                checked_in: false,
                team_assignment: null, // Free Agent
                is_captain: false,
                has_signed: hasSigned,
                is_winner: false
            });

            if (hasSigned) {
                waiverData.push({ user_id: userId, facility_id: game.facility_id || null });
            }
            playerIndex++;
        }

        // Insert Fake Bookings
        const { error: bookingError } = await adminSupabase.from('bookings').insert(bookingData);
        if (bookingError) throw bookingError;

        // Insert Fake Waivers
        if (waiverData.length > 0) {
            const { error: waiverError } = await adminSupabase.from('waiver_signatures').insert(waiverData);
            if (waiverError) {
                console.warn("[SEED] Failed to insert fake waivers. Proceeding anyway.", waiverError);
            }
        }

        return { success: true, message: "Injected 60 synthetic players successfully." };

    } catch (err: any) {
        console.error("Seed Error:", err);
        return { success: false, error: err.message };
    }
}
