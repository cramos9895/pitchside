
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { MapPin, Clock, ArrowRight, Calendar, Users, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameCard } from '@/components/GameCard';
import { LeagueCard } from '@/components/public/LeagueCard';
import { TournamentCard } from '@/components/public/TournamentCard';

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
}

interface League {
    id: string;
    title: string;
    location: string;
    location_nickname?: string;
    start_time: string | null;
    end_time: string | null;
    team_price: number | null;
    free_agent_price: number | null;
    max_teams: number | null;
    prize_type: string | null;
    prize_pool_percentage: number | null;
    fixed_prize_amount: number | null;
    reward: string | null;
    roster_lock_date: string | null;
    regular_season_start: string | null;
    playoff_start_date: string | null;
}

export const revalidate = 0; // Ensure fresh data

// Helper to format date for grouping header
const formatDateHeader = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

export default async function SchedulePage({ 
    searchParams 
}: { 
    searchParams: { view?: string } 
}) {
    const supabase = await createClient();
    const activeView = (await searchParams).view || 'all';

    // Fetch user bookings to check status
    const { data: { user } } = await supabase.auth.getUser();
    const bookingStatusMap = new Map<string, string>();
    const bookingIdMap = new Map<string, string>();

    if (user) {
        const { data: bookings } = await supabase
            .from('bookings')
            .select('id, game_id, status')
            .eq('user_id', user.id)
            .neq('status', 'cancelled');

        if (bookings) {
            bookings.forEach((b: any) => {
                bookingStatusMap.set(b.game_id, b.status);
                bookingIdMap.set(b.game_id, b.id);
            });
        }
    }

    // Fetch all upcoming games if needed
    let games: any[] | null = null;
    let gamesError = null;
    if (activeView === 'all' || activeView === 'pickup') {
        const res = await supabase
            .from('games')
            .select('*')
            .neq('status', 'cancelled')
            .or('is_league.eq.false,is_league.is.null') // MUST filter out league games here
            .gt('start_time', new Date().toISOString())
            .order('start_time', { ascending: true });
        games = res.data;
        gamesError = res.error;
    }

    // Fetch all upcoming leagues if needed
    let leagues: any[] | null = null;
    let leaguesError = null;
    if (activeView === 'all' || activeView === 'leagues') {
        const [leaguesRes, leagueGamesRes] = await Promise.all([
            supabase
                .from('leagues')
                .select('*')
                .neq('status', 'cancelled')
                .or('event_type.eq.league,event_type.is.null')
                .order('start_date', { ascending: true }),
            supabase
                .from('games')
                .select('*')
                .eq('event_type', 'league')
                .neq('status', 'cancelled')
                .gt('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
        ]);

        // Merge results
        const leaguesTable = leaguesRes.data || [];
        const gamesLeaguesTable = leagueGamesRes.data || [];
        
        leagues = [...gamesLeaguesTable, ...leaguesTable];
        leaguesError = leaguesRes.error || leagueGamesRes.error;
    }

    // Fetch all upcoming tournaments if needed
    let tournaments: any[] | null = null;
    let tournamentsError = null;
    if (activeView === 'all' || activeView === 'tournaments') {
        const res = await supabase
            .from('games')
            .select('*, tournament_registrations(user_id, team_id, role)')
            .neq('status', 'cancelled')
            .eq('event_type', 'tournament')
            .gt('start_time', new Date().toISOString())
            .order('start_time', { ascending: true });
        tournaments = res.data;
        tournamentsError = res.error;
    }

    if (gamesError) console.error("Error fetching games:", gamesError);
    if (leaguesError) console.error("Error fetching leagues:", leaguesError);
    if (tournamentsError) console.error("Error fetching tournaments:", tournamentsError);

    // Group games by date
    const groupedGames: Record<string, Game[]> = {};
    if (games) {
        games.forEach(game => {
            const dateKey = formatDateHeader(game.start_time);
            if (!groupedGames[dateKey]) {
                groupedGames[dateKey] = [];
            }
            groupedGames[dateKey].push(game);
        });
    }

    const tabs = [
        { id: 'all', label: 'All Events', icon: Calendar },
        { id: 'pickup', label: 'Pickup Games', icon: Users },
        { id: 'tournaments', label: 'Tournaments', icon: Trophy },
        { id: 'leagues', label: 'Leagues', icon: Trophy },
    ];

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans pt-2 px-4 pb-24">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-white/5 pb-8">
                    <div>
                        <h1 className="font-heading text-5xl md:text-7xl font-bold uppercase italic tracking-tighter leading-none mb-2">
                            The <span className="text-pitch-accent">Hub</span>
                        </h1>
                        <p className="text-pitch-secondary text-sm font-bold uppercase tracking-widest opacity-60">
                            Northwest Chicago's Premier Soccer Network
                        </p>
                    </div>
                    <Link href="/" className="inline-flex items-center text-pitch-secondary hover:text-white transition-colors text-xs font-black uppercase tracking-[0.2em] group">
                        <ArrowRight className="w-4 h-4 mr-2 rotate-180 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </Link>
                </div>

                {/* Sticky Tab Navigation (Apple-widget style) */}
                <div className="sticky top-24 z-30 bg-pitch-black/80 backdrop-blur-md py-4 mb-12 border-b border-white/5">
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 max-w-fit md:max-w-none overflow-x-auto no-scrollbar">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeView === tab.id;
                            return (
                                <Link
                                    key={tab.id}
                                    href={`/schedule?view=${tab.id}`}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                        isActive 
                                            ? "bg-pitch-accent text-pitch-black shadow-[0_0_20px_rgba(204,255,0,0.2)] scale-[1.02]" 
                                            : "text-gray-500 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4", isActive ? "text-pitch-black" : "text-gray-500")} />
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="space-y-16">
                    {/* LEAGUES SECTION */}
                    {(activeView === 'all' || activeView === 'leagues') && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 text-pitch-accent text-xs font-black uppercase tracking-[0.3em]">
                                <Trophy className="w-4 h-4" /> Upcoming Leagues
                                <div className="h-px bg-pitch-accent/20 flex-1 ml-2" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {leagues?.map((league: any) => (
                                    <LeagueCard key={league.id} league={league} userId={user?.id} />
                                ))}
                            </div>
                            {(!leagues || leagues.length === 0) && activeView === 'leagues' && (
                                <div className="text-center py-20 bg-white/5 rounded-sm border border-dashed border-white/10">
                                    <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                    <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">No Active Leagues Found</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TOURNAMENTS SECTION */}
                    {(activeView === 'all' || activeView === 'tournaments') && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 text-pitch-accent text-xs font-black uppercase tracking-[0.3em]">
                                <Trophy className="w-4 h-4" /> Upcoming Tournaments
                                <div className="h-px bg-pitch-accent/20 flex-1 ml-2" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {tournaments?.map((tournament: any) => (
                                    <TournamentCard 
                                        key={tournament.id} 
                                        tournament={tournament} 
                                        userId={user?.id}
                                        registrations={tournament.tournament_registrations} 
                                    />
                                ))}
                            </div>
                            {(!tournaments || tournaments.length === 0) && activeView === 'tournaments' && (
                                <div className="text-center py-20 bg-white/5 rounded-sm border border-dashed border-white/10">
                                    <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                    <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">No Active Tournaments Found</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PICKUP GAMES SECTION */}
                    {(activeView === 'all' || activeView === 'pickup') && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 text-pitch-accent text-xs font-black uppercase tracking-[0.3em]">
                                <Users className="w-4 h-4" /> Upcoming Pickups
                                <div className="h-px bg-pitch-accent/20 flex-1 ml-2" />
                            </div>
                            <div className="space-y-12">
                                {Object.entries(groupedGames).map(([date, dailyGames]) => (
                                    <div key={date} className="relative">
                                        <div className="flex items-center gap-3 mb-6">
                                            <span className="w-2 h-6 bg-white/10 rounded-full" />
                                            <h2 className="font-heading text-2xl font-bold uppercase italic text-white tracking-tight">
                                                {date}
                                            </h2>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {dailyGames.map((game) => (
                                                <GameCard
                                                    key={game.id}
                                                    game={game}
                                                    user={user}
                                                    bookingStatus={bookingStatusMap.get(game.id)}
                                                    bookingId={bookingIdMap.get(game.id)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {(!games || games.length === 0) && (
                                    <div className="text-center py-20 bg-white/5 rounded-sm border border-dashed border-white/10">
                                        <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                        <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Check back for new games</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
