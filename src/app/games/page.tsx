
import { createClient } from '@/lib/supabase/server';
import { PickupCard } from '@/components/public/pickup/PickupCard';
import { TournamentCard } from '@/components/public/tournaments/TournamentCard';
import { LeagueCard } from '@/components/public/leagues/LeagueCard';
import { RollingLeagueCard } from '@/components/public/RollingLeagueCard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Game {
    id: string;
    title: string;
    location_name?: string;
    location: string;
    location_nickname?: string;
    game_format?: string;
    start_time: string;
    end_time: string | null;
    price: number;
    max_players: number;
    max_teams: number | null;
    current_players: number;
    surface_type: string;
    facility_id?: string | null;
    resource_id?: string | null;
    status: string;
    has_mvp_reward?: boolean;
    match_style?: string;
    event_type?: string;
    is_league?: boolean;
    team_price: number | null;
    free_agent_price: number | null;
    prize_pool_percentage: number | null;
    fixed_prize_amount: number | null;
    reward: string | null;
    prize_type: string | null;
    tournament_style: string | null;
    roster_lock_date: string | null;
    regular_season_start: string | null;
    playoff_start_date: string | null;

    // Architecture Columns
    league_format?: 'structured' | 'rolling';
    payment_collection_type?: 'stripe' | 'cash';
}

export const revalidate = 0;

export default async function GamesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const bookingStatusMap = new Map<string, string>();
    const bookingIdMap = new Map<string, string>();
    const userRegistrationsMap = new Map<string, any[]>();

    if (user) {
        const [bookingsRes, regsRes] = await Promise.all([
            supabase
                .from('bookings')
                .select('id, game_id, status')
                .eq('user_id', user.id)
                .neq('status', 'cancelled'),
            supabase
                .from('tournament_registrations')
                .select('game_id, role, team_id, user_id, status, teams(id, name, captain_id)')
                .eq('user_id', user.id)
        ]);

        if (bookingsRes.data) {
            bookingsRes.data.forEach((b: any) => {
                bookingStatusMap.set(b.game_id, b.status);
                bookingIdMap.set(b.game_id, b.id);
            });
        }

        if (regsRes.data) {
            regsRes.data.forEach((r: any) => {
                if (r.game_id) {
                    if (!userRegistrationsMap.has(r.game_id)) {
                        userRegistrationsMap.set(r.game_id, []);
                    }
                    userRegistrationsMap.get(r.game_id)!.push(r);
                }
            });
        }
    }

    const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Error fetching games:', error);
    }

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans p-6 pt-2">
            <div className="max-w-7xl mx-auto">
                <Link href="/" className="flex items-center text-pitch-secondary hover:text-white mb-8 transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                </Link>

                <h1 className="font-heading text-4xl md:text-5xl font-bold uppercase italic tracking-tighter mb-12">
                    All Upcoming <span className="text-pitch-accent">Matches</span>
                </h1>

                {!games || games.length === 0 ? (
                    <div className="text-center py-20 border border-white/5 rounded-sm bg-pitch-card">
                        <p className="text-xl text-pitch-secondary font-bold">No games scheduled yet.</p>
                        <p className="text-sm text-gray-500 mt-2">Check back soon for upcoming matches.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {games.map((game: any) => {
                            const registrations = userRegistrationsMap.get(game.id) || [];

                            if (game.event_type === 'pickup' || game.event_type === 'standard') {
                                return (
                                    <PickupCard
                                        key={game.id}
                                        game={game}
                                        user={user}
                                        bookingStatus={bookingStatusMap.get(game.id)}
                                        bookingId={bookingIdMap.get(game.id)}
                                    />
                                );
                            }

                            if (game.event_type === 'tournament') {
                                return (
                                    <TournamentCard
                                        key={game.id}
                                        tournament={game}
                                        userId={user?.id}
                                        registrations={registrations}
                                    />
                                );
                            }

                            if (game.event_type === 'league') {
                                if (game.league_format === 'rolling') {
                                    return (
                                        <RollingLeagueCard
                                            key={game.id}
                                            league={game}
                                            userId={user?.id}
                                            registrations={registrations}
                                        />
                                    );
                                }
                                return (
                                    <LeagueCard
                                        key={game.id}
                                        league={game}
                                        userId={user?.id}
                                        registrations={registrations}
                                    />
                                );
                            }

                            // Fallback for unmatched types (like rentals or edge cases)
                            return (
                                <PickupCard
                                    key={game.id}
                                    game={game}
                                    user={user}
                                    bookingStatus={bookingStatusMap.get(game.id)}
                                    bookingId={bookingIdMap.get(game.id)}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
