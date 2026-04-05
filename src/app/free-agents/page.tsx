import { createClient } from '@/lib/supabase/server';
import { FreeAgentPoolClient } from './FreeAgentPoolClient';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Free Agent Pool | PITCHSIDE',
    description: 'Draft the best available talent for your PITCHSIDE squad. View player stats, positions, and OVR ratings.',
};

async function FreeAgentData() {
    const supabase = await createClient();
    
    // 1. Get Current User
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Fetch Free Agents (pending bookings)
    // We join with profiles for player stats and games for match context
    const { data: freeAgents } = await supabase
        .from('bookings')
        .select(`
            id,
            game_id,
            user_id,
            status,
            created_at,
            profiles:user_id (
                id,
                full_name,
                avatar_url,
                position,
                ovr,
                matches_played,
                wins,
                mvps,
                win_percentage
            ),
            games:game_id (
                id,
                title,
                start_time,
                location_nickname,
                teams_config
            )
        `)
        .eq('status', 'free_agent_pending')
        .order('created_at', { ascending: false });

    // 3. Fetch User's own bookings to check Captain Status
    // A user is a captain if they have a payment method vaulted for a current match
    let userBookings: any[] = [];
    if (user) {
        const { data: bookings } = await supabase
            .from('bookings')
            .select('id, game_id, team_assignment, stripe_payment_method_id, status')
            .eq('user_id', user.id);
        
        userBookings = bookings || [];
    }

    return (
        <FreeAgentPoolClient 
            freeAgents={freeAgents || []} 
            currentUser={user}
            userBookings={userBookings}
        />
    );
}

export default function FreeAgentPoolPage() {
    return (
        <div className="min-h-screen bg-pitch-black pt-8 px-6 pb-24">
            <div className="max-w-7xl mx-auto">
                <Suspense fallback={
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="w-12 h-12 animate-spin text-pitch-accent opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-pitch-secondary">Parsing Global Talent Feed...</p>
                    </div>
                }>
                    <FreeAgentData />
                </Suspense>
            </div>
        </div>
    );
}
