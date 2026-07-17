'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TournamentHeader } from './TournamentHeader';
import { TournamentGameDayTab } from './TournamentGameDayTab';
import { TournamentSquadsTab } from './TournamentSquadsTab';
import { TournamentScheduleTab } from './TournamentScheduleTab';
import { TournamentSettingsTab } from './TournamentSettingsTab';
import { TournamentFinancialsTab } from './TournamentFinancialsTab';
import { TournamentLeaderboardTab } from './TournamentLeaderboardTab';

export function AdminTournamentManager({
    gameId,
    leagueTitle,
    registrations,
    matches,
    teams,
    facilityId,
    game,
    onRefresh
}: any) {
    const searchParams = useSearchParams();
    const urlTab = searchParams.get('tab') || 'gameday';
    
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(urlTab);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    const handleRefresh = async () => {
        setLoading(true);
        await onRefresh();
        setLoading(false);
    };

    const activePlayers = registrations.filter((b: any) => 
        ['active', 'paid', 'confirmed', 'registered'].includes(b.status) || 
        b.roster_status === 'confirmed'
    );
    const uniqueRegisteredTeamIds = new Set(activePlayers.map((p: any) => p.team_id).filter(Boolean));
    const registeredTeamsCount = uniqueRegisteredTeamIds.size;

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
            <TournamentHeader 
                title={leagueTitle} 
                status={game.status}
                registeredTeamsCount={registeredTeamsCount}
                maxTeams={game.max_teams}
                onRefresh={handleRefresh}
                loading={loading}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start flex-nowrap bg-black border-b border-white/10 rounded-none mb-8 p-0 h-auto gap-6 sm:gap-8 overflow-x-auto hide-scrollbar">
                    <TabsTrigger 
                        value="gameday" 
                        className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-pitch-accent px-0 py-3 text-xs sm:text-sm font-black uppercase tracking-widest text-gray-500 data-[state=active]:text-white transition-all whitespace-nowrap"
                    >
                        Game Day
                    </TabsTrigger>
                    <TabsTrigger 
                        value="squads" 
                        className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-pitch-accent px-0 py-3 text-xs sm:text-sm font-black uppercase tracking-widest text-gray-500 data-[state=active]:text-white transition-all whitespace-nowrap"
                    >
                        Squads
                    </TabsTrigger>
                    <TabsTrigger 
                        value="schedule" 
                        className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-pitch-accent px-0 py-3 text-xs sm:text-sm font-black uppercase tracking-widest text-gray-500 data-[state=active]:text-white transition-all whitespace-nowrap"
                    >
                        Schedule
                    </TabsTrigger>
                    <TabsTrigger 
                        value="leaderboard" 
                        className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-pitch-accent px-0 py-3 text-xs sm:text-sm font-black uppercase tracking-widest text-gray-500 data-[state=active]:text-white transition-all whitespace-nowrap"
                    >
                        Leaderboard
                    </TabsTrigger>
                    <TabsTrigger 
                        value="settings" 
                        className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-pitch-accent px-0 py-3 text-xs sm:text-sm font-black uppercase tracking-widest text-gray-500 data-[state=active]:text-white transition-all whitespace-nowrap"
                    >
                        Settings
                    </TabsTrigger>
                    <TabsTrigger 
                        value="financials" 
                        className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-pitch-accent px-0 py-3 text-xs sm:text-sm font-black uppercase tracking-widest text-gray-500 data-[state=active]:text-white transition-all whitespace-nowrap"
                    >
                        Financials
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="gameday" className="outline-none">
                    <TournamentGameDayTab 
                        registrations={registrations} 
                        teams={teams}
                        gameId={gameId}
                        game={game}
                        onRefresh={handleRefresh}
                    />
                </TabsContent>

                <TabsContent value="squads" className="outline-none">
                    <TournamentSquadsTab 
                        registrations={registrations} 
                        teams={teams}
                        gameId={gameId}
                        game={game}
                        onRefresh={handleRefresh}
                    />
                </TabsContent>

                <TabsContent value="schedule" className="outline-none">
                    <TournamentScheduleTab 
                        matches={matches}
                        teams={teams}
                        gameId={gameId}
                        game={game}
                        registrations={registrations}
                        facilityId={facilityId}
                        onRefresh={handleRefresh}
                    />
                </TabsContent>

                <TabsContent value="leaderboard" className="outline-none">
                    <TournamentLeaderboardTab 
                        game={game}
                        teams={teams}
                        matches={matches}
                    />
                </TabsContent>

                <TabsContent value="settings" className="outline-none">
                    <TournamentSettingsTab game={game} onRefresh={handleRefresh} />
                </TabsContent>

                <TabsContent value="financials" className="outline-none">
                    <TournamentFinancialsTab 
                        game={game}
                        registrations={registrations}
                        matches={matches}
                        teams={teams}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
