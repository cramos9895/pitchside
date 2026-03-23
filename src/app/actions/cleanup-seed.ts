'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function cleanupTournamentSeed(gameId: string) {
    if (process.env.NODE_ENV !== 'development') {
        throw new Error("This utility is strictly for local development testing.");
    }

    const adminSupabase = createAdminClient();

    try {
        console.log(`[SEED_CLEANUP] Initiating teardown for game ${gameId}...`);

        // 1. Find all dummy profiles directly from the Auth level (bypasses missing public.profiles triggers)
        // We MUST loop through pagination, because the dev interrupted previous tests, leaving 240+ orphaned users!
        let allUsers: any[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const { data: { users }, error: authError } = await adminSupabase.auth.admin.listUsers({ page, perPage: 100 });
            if (authError) throw authError;
            
            if (users.length === 0) {
                hasMore = false;
            } else {
                allUsers = [...allUsers, ...users];
                page++;
            }
        }

        const dummyUsers = allUsers.filter(u => u.email?.includes('@testtournament.com'));
        
        if (!dummyUsers || dummyUsers.length === 0) {
            console.log("[SEED_CLEANUP] No dummy users found to clean up.");
            return { success: true, message: "No dummy users found to clean up." };
        }

        const dummyIds = dummyUsers.map(u => u.id);
        console.log(`[SEED_CLEANUP] Found ${dummyIds.length} synthetic profiles to destroy.`);

        // 2. Clear all Foreign Key constraints natively so Supabase permits the root deletion
        console.log(`[SEED_CLEANUP] Severing Cross-Table Dependencies (Waivers, Bookings, Profiles)...`);
        
        // Delete in batches of 100 to prevent local query string limits
        for (let i = 0; i < dummyIds.length; i += 100) {
            const batchIds = dummyIds.slice(i, i + 100);
            
            await adminSupabase.from('waiver_signatures').delete().in('user_id', batchIds);
            await adminSupabase.from('bookings').delete().in('user_id', batchIds);
            await adminSupabase.from('profiles').delete().in('id', batchIds);
        }

        // 3. Delete the actual Auth Users
        console.log(`[SEED_CLEANUP] Purging root Auth layer...`);
        let deletedCount = 0;
        
        // Batch deletion to avoid rate limits
        for (let batch = 0; batch < Math.ceil(dummyIds.length / 10); batch++) {
            const promises = [];
            for (let i = 0; i < 10; i++) {
                const idx = batch * 10 + i;
                if (idx >= dummyIds.length) break;
                // Deleting via Auth Admin instantly rips them out from the entire project
                promises.push(adminSupabase.auth.admin.deleteUser(dummyIds[idx]));
            }
            const results = await Promise.all(promises);
            deletedCount += results.filter(r => !r.error).length;
            results.filter(r => r.error).forEach(r => console.error("Deletion Blocked:", r.error));
        }

        console.log(`[SEED_CLEANUP] Successfully permanently deleted ${deletedCount} authentic auth users.`);
        return { success: true, message: `Teardown complete. Wiped ${deletedCount} dummy users from the platform.` };

    } catch (err: any) {
        console.error("Cleanup Error:", err);
        return { success: false, error: err.message };
    }
}
