import { StandingsTable } from '../StandingsTable';

export function TournamentLeaderboardTab({ game, teams, matches }: any) {
    return (
        <div className="animate-in fade-in duration-300">
            <StandingsTable 
                gameId={game.id}
                teams={teams}
                matches={matches}
                teamsIntoPlayoffs={game.teams_into_playoffs || 4}
            />
        </div>
    );
}
