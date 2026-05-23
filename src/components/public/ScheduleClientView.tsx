'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, Trophy, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PickupCard } from '@/components/public/pickup/PickupCard';
import { TournamentCard } from '@/components/public/tournaments/TournamentCard';
import { LeagueCard } from '@/components/public/leagues/LeagueCard';
import { RollingLeagueCard } from '@/components/public/RollingLeagueCard';

interface ScheduleClientViewProps {
    games: any[] | null;
    leagues: any[] | null;
    tournaments: any[] | null;
    activeView: string;
    user: any;
    bookingStatusMap: Record<string, string>;
    bookingIdMap: Record<string, string>;
    userRegistrationsMap: Record<string, any[]>;
}

const formatDateHeader = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

export function ScheduleClientView({
    games,
    leagues,
    tournaments,
    activeView,
    user,
    bookingStatusMap,
    bookingIdMap,
    userRegistrationsMap
}: ScheduleClientViewProps) {
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [activeSort, setActiveSort] = useState<string>('soonest');
    
    const tabs = [
        { id: 'all', label: 'All Events', icon: Calendar },
        { id: 'pickup', label: 'Pickup Games', icon: Users },
        { id: 'tournaments', label: 'Tournaments', icon: Trophy },
        { id: 'leagues', label: 'Leagues', icon: Trophy },
    ];

    const filterOptions = ['This Week', '5v5', '7v7', '11v11', 'Competitive', 'Casual', 'Mens', 'Womens', 'Co-ed'];

    const toggleFilter = (filter: string) => {
        setActiveFilters(prev => 
            prev.includes(filter) 
                ? prev.filter(f => f !== filter) 
                : [...prev, filter]
        );
    };

    // --- Filtering Logic ---
    const applyFilters = (items: any[] | null) => {
        if (!items) return [];
        return items.filter(item => {
            if (activeFilters.length === 0) return true;
            
            const start = new Date(item.start_time || item.start_date);
            const isWeekend = start.getDay() === 0 || start.getDay() === 6;
            
            const now = new Date();
            const endOfWeek = new Date(now);
            endOfWeek.setDate(now.getDate() + (7 - now.getDay())); // Until Sunday
            const isThisWeek = start <= endOfWeek;

            const format = (item.game_format || '').toLowerCase();
            const style = (item.match_style || '').toLowerCase();
            const title = (item.title || '').toLowerCase();
            const tournamentStyle = (item.tournament_style || '').toLowerCase();

            const combinedText = `${style} ${title} ${tournamentStyle}`;

            // All active filters must match (AND logic)
            return activeFilters.every(filter => {
                switch(filter) {
                    case 'This Week': return isThisWeek;
                    case '5v5': return format.includes('5v5') || combinedText.includes('5v5');
                    case '7v7': return format.includes('7v7') || combinedText.includes('7v7');
                    case '11v11': return format.includes('11v11') || combinedText.includes('11v11');
                    case 'Competitive': return combinedText.includes('competitive');
                    case 'Casual': return combinedText.includes('casual');
                    case 'Mens': return combinedText.includes('mens') || combinedText.includes("men's") || combinedText.includes('men');
                    case 'Womens': return combinedText.includes('womens') || combinedText.includes("women's") || combinedText.includes('women');
                    case 'Co-ed': return combinedText.includes('co-ed') || combinedText.includes('coed');
                    default: return true;
                }
            });
        });
    };

    // --- Sorting Logic ---
    const applySort = (items: any[]) => {
        return items.sort((a, b) => {
            if (activeSort === 'soonest') {
                return new Date(a.start_time || a.start_date).getTime() - new Date(b.start_time || b.start_date).getTime();
            }
            if (activeSort === 'price') {
                const priceA = a.price || a.team_price || 0;
                const priceB = b.price || b.team_price || 0;
                return priceA - priceB;
            }
            if (activeSort === 'spots') {
                const spotsA = (a.max_players || 0) - (a.current_players || 0);
                const spotsB = (b.max_players || 0) - (b.current_players || 0);
                // More spots available comes first
                return spotsB - spotsA; 
            }
            return 0;
        });
    };

    const filteredGames = applySort(applyFilters(games));
    const filteredLeagues = applySort(applyFilters(leagues));
    const filteredTournaments = applySort(applyFilters(tournaments));

    // Group filtered games by date
    const groupedGames: Record<string, any[]> = {};
    filteredGames.forEach(game => {
        const dateKey = formatDateHeader(game.start_time);
        if (!groupedGames[dateKey]) {
            groupedGames[dateKey] = [];
        }
        groupedGames[dateKey].push(game);
    });

    return (
        <>
            {/* Sticky Tab Navigation & Filters */}
            <div className="sticky top-20 z-30 bg-pitch-black/80 backdrop-blur-md py-4 mb-12 border-b border-white/5 space-y-4">
                {/* Tabs */}
                <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 max-w-fit md:max-w-none overflow-x-auto hide-scrollbar">
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
                
                {/* Filters & Sort */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Pill Filter Bar */}
                    <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 lg:pb-0">
                        {filterOptions.map(filter => {
                            const isActive = activeFilters.includes(filter);
                            return (
                                <button
                                    key={filter}
                                    onClick={() => toggleFilter(filter)}
                                    className={cn(
                                        "px-4 py-2 text-[10px] uppercase tracking-widest whitespace-nowrap transition-colors rounded-sm border",
                                        isActive 
                                            ? "bg-[#cbff00] text-black font-black border-[#cbff00]" 
                                            : "bg-black/50 text-white/60 font-bold border-white/10 hover:border-white/30 hover:text-white"
                                    )}
                                >
                                    {filter}
                                </button>
                            );
                        })}
                    </div>

                    {/* Global Sort Dropdown */}
                    <div className="relative shrink-0 border border-white/20 rounded-sm bg-transparent hover:border-white/40 transition-colors flex items-center">
                        <div className="absolute left-3 pointer-events-none text-[10px] font-black uppercase tracking-widest text-white/40">Sort:</div>
                        <select
                            value={activeSort}
                            onChange={(e) => setActiveSort(e.target.value)}
                            className="w-full h-full bg-transparent text-[10px] font-bold uppercase tracking-widest text-white/80 outline-none appearance-none cursor-pointer pl-14 pr-8 py-2 m-0"
                        >
                            <option value="soonest" className="bg-pitch-black text-white">Soonest First</option>
                            <option value="price" className="bg-pitch-black text-white">Price: Low to High</option>
                            <option value="spots" className="bg-pitch-black text-white">Spots Available</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-white/40 absolute right-3 pointer-events-none" />
                    </div>
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
                            {filteredLeagues.map((league: any) => {
                                const formattedLeague = {
                                    ...league,
                                    event_type: league.event_type || 'league',
                                    start_time: league.start_time || league.start_date
                                };
                                const registrations = userRegistrationsMap[league.id] || league.tournament_registrations || [];

                                if (formattedLeague.league_format === 'rolling') {
                                    return (
                                        <RollingLeagueCard
                                            key={league.id}
                                            league={formattedLeague}
                                            userId={user?.id}
                                            registrations={registrations}
                                        />
                                    );
                                }

                                return (
                                    <LeagueCard
                                        key={league.id}
                                        league={formattedLeague}
                                        userId={user?.id}
                                        registrations={registrations}
                                    />
                                );
                            })}
                        </div>
                        {(!filteredLeagues || filteredLeagues.length === 0) && activeView === 'leagues' && (
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
                            {filteredTournaments.map((tournament: any) => (
                                <TournamentCard 
                                    key={tournament.id} 
                                    tournament={tournament} 
                                    userId={user?.id}
                                    registrations={userRegistrationsMap[tournament.id] || tournament.tournament_registrations || []} 
                                />
                            ))}
                        </div>
                        {(!filteredTournaments || filteredTournaments.length === 0) && activeView === 'tournaments' && (
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
                                            <PickupCard
                                                key={game.id}
                                                game={game}
                                                user={user}
                                                bookingStatus={bookingStatusMap[game.id]}
                                                bookingId={bookingIdMap[game.id]}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {(!filteredGames || filteredGames.length === 0) && (
                                <div className="text-center py-20 bg-white/5 rounded-sm border border-dashed border-white/10">
                                    <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                    <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">No games match your filters</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </>
    );
}
