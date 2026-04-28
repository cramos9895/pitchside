'use client';

import React from 'react';
import { RollingSalesView } from './RollingSalesView';
import { RollingFreeAgentView } from './RollingFreeAgentView';
import { RollingCommandCenterView } from './RollingCommandCenterView';

interface RollingLeagueHubProps {
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

export function RollingLeagueHub({ 
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
}: RollingLeagueHubProps) {
    
    // Render the appropriate sub-view based on the user's role
    switch (userRole) {
        case 'unregistered':
            return (
                <RollingSalesView 
                    game={game} 
                    primaryHost={primaryHost} 
                    registeredTeams={registeredTeams} 
                />
            );
        case 'free_agent':
            return (
                <RollingFreeAgentView 
                    game={game} 
                    primaryHost={primaryHost} 
                    registeredTeams={registeredTeams} 
                />
            );
        case 'player':
        case 'captain':
            // Both players and captains see the Command Center, but actions differ inside
            if (!team) return <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white">Loading Team Data...</div>;
            
            const protocol = typeof window !== 'undefined' && window.location.host.includes('localhost') ? 'http' : 'https';
            const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
            const tournamentUrlBase = `${protocol}://${host}/rolling-leagues/${game.id}`;

            return (
                <RollingCommandCenterView 
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
            );
        default:
            return <div className="min-h-screen bg-pitch-black flex items-center justify-center text-white">Invalid State</div>;
    }
}
