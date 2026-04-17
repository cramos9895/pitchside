'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminRollingHeader } from './AdminRollingHeader';
import { GameDayTab } from './GameDayTab';
import { SquadsTab } from './SquadsTab';
import { ScheduleTab } from './ScheduleTab';
import { SettingsTab } from './SettingsTab';
import { FinancialsTab } from './FinancialsTab';

export function AdminRollingManager({
    gameId,
    leagueTitle,
    registrations,
    matches,
    teams,
    facilityId,
    game,
    onRefresh
}: any) {
    const [loading, setLoading] = useState(false);

    const handleRefresh = async () => {
        setLoading(true);
        await onRefresh();
        setLoading(false);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
            <AdminRollingHeader 
                leagueTitle={leagueTitle} 
                onRefresh={handleRefresh}
                loading={loading}
            />

            <Tabs defaultValue="gameday" className="w-full">
                <TabsList className="w-full justify-start bg-black border-b border-white/10 rounded-none mb-8 p-0 h-auto gap-6 sm:gap-8 overflow-x-auto hide-scrollbar">
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
                        Squads (God Mode)
                    </TabsTrigger>
                    <TabsTrigger 
                        value="schedule" 
                        className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-pitch-accent px-0 py-3 text-xs sm:text-sm font-black uppercase tracking-widest text-gray-500 data-[state=active]:text-white transition-all whitespace-nowrap"
                    >
                        Schedule Engine
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
                        Financials P&L
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="gameday" className="outline-none">
                    <GameDayTab 
                        registrations={registrations} 
                        teams={teams}
                        gameId={gameId}
                        game={game}
                        onRefresh={handleRefresh}
                    />
                </TabsContent>

                <TabsContent value="squads" className="outline-none">
                    <SquadsTab 
                        registrations={registrations} 
                        teams={teams}
                        gameId={gameId}
                        game={game}
                        onRefresh={handleRefresh}
                    />
                </TabsContent>

                <TabsContent value="schedule" className="outline-none">
                    <ScheduleTab 
                        matches={matches}
                        teams={teams}
                        gameId={gameId}
                        facilityId={facilityId}
                        onRefresh={handleRefresh}
                    />
                </TabsContent>

                <TabsContent value="settings" className="outline-none">
                    <SettingsTab game={game} onRefresh={handleRefresh} />
                </TabsContent>

                <TabsContent value="financials" className="outline-none">
                    <FinancialsTab 
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
