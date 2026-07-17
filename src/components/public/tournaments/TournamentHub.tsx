'use client';

import React, { Suspense } from 'react';
import { TournamentSalesView } from './TournamentSalesView';
import { TournamentFreeAgentView } from './TournamentFreeAgentView';
import { TournamentCommandCenterView } from './TournamentCommandCenterView';

interface TournamentHubProps {
    game: any;
    currentUser: any;
    userRole: 'unregistered' | 'free_agent' | 'player' | 'captain';
    primaryHost: any;
    registeredTeams: any[];
    // Command Center Props
    team?: any;
    roster?: any[];
    freeAgents?: any[];
    matches?: any[];
    initialMessages?: any[];
    allTeams?: any[];
    lineups?: any[];
    attendance?: any[];
}

export function TournamentHub({ 
    game, 
    currentUser, 
    userRole, 
    primaryHost, 
    registeredTeams,
    team,
    roster,
    attendance,
    freeAgents,
    matches,
    initialMessages,
    allTeams,
    lineups
}: TournamentHubProps) {
    
    // Render the appropriate sub-view based on the user's role
    switch (userRole) {
        case 'unregistered':
            return (
                <TournamentSalesView 
                    game={game} 
                    primaryHost={primaryHost} 
                    registeredTeams={registeredTeams} 
                />
            );
        case 'free_agent':
            return (
                <TournamentFreeAgentView 
                    game={game} 
                    primaryHost={primaryHost} 
                    registeredTeams={registeredTeams}
                    currentUserId={currentUser.id}
                />
            );
        case 'player':
        case 'captain':
            // Both players and captains see the Command Center, but actions differ inside
            if (!team) return <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white">Loading Team Data...</div>;
            
            const protocol = typeof window !== 'undefined' && window.location.host.includes('localhost') ? 'http' : 'https';
            const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
            const tournamentUrlBase = `${protocol}://${host}/tournaments/${game.id}`;

            return (
                <Suspense fallback={<div className="animate-pulse border border-[#cbff00] bg-black h-96 w-full rounded-md" />}>
                    <TournamentCommandCenterView 
                        team={team}
                        tournament={game}
                        roster={roster || []}
                        freeAgents={freeAgents || []}
                        matches={matches || []}
                        teams={allTeams || []}
                        initialMessages={initialMessages || []}
                        tournamentUrlBase={tournamentUrlBase}
                        isCaptain={userRole === 'captain'}
                        currentUserId={currentUser.id}
                        lineups={lineups || []}
                    />
                </Suspense>
            );
        default:
            return <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white">Invalid State</div>;
    }
}
