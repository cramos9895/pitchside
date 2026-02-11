import { useState } from 'react';
import { User, Shuffle, ArrowRight, ArrowLeft, RefreshCw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface Player {
    id: string; // booking_id
    userId: string;
    name: string;
    email: string;
    team: 'A' | 'B' | null;
    status: string; // 'active' | 'paid' | 'waitlist'
}

interface TeamConfig {
    name: string;
    color: string;
}

interface TeamManagerProps {
    gameId: string;
    players: Player[];
    teams: TeamConfig[];
    onUpdate: () => void;
}

const COLOR_MAP: Record<string, string> = {
    'Neon Orange': 'border-orange-500/30 bg-orange-500/5',
    'Neon Blue': 'border-cyan-500/30 bg-cyan-500/5',
    'Neon Green': 'border-[#ccff00]/30 bg-[#ccff00]/5',
    'White': 'border-white/30 bg-white/5',
    'Black': 'border-gray-600 bg-gray-900',
    'Red': 'border-red-500/30 bg-red-500/5',
    'Yellow': 'border-yellow-400/30 bg-yellow-400/5'
};

const TEXT_COLOR_MAP: Record<string, string> = {
    'Neon Orange': 'text-orange-500',
    'Neon Blue': 'text-cyan-400',
    'Neon Green': 'text-[#ccff00]',
    'White': 'text-white',
    'Black': 'text-gray-400',
    'Red': 'text-red-500',
    'Yellow': 'text-yellow-400'
};

export function TeamManager({ gameId, players, teams, onUpdate }: TeamManagerProps) {
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(false);

    // Filter only active/paid players for team assignment
    const activePlayers = players.filter(p => p.status === 'active' || p.status === 'paid');

    const unassigned = activePlayers.filter(p => !p.team);

    const handleMove = async (bookingId: string, team: string | null) => {
        setLoading(true);
        try {
            const response = await fetch('/api/games/teams', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId, bookingId, team })
            });

            if (!response.ok) throw new Error('Failed to update team');

            success('Player moved successfully');
            onUpdate();
        } catch (err: any) {
            toastError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRandomize = async () => {
        if (!confirm('This will reshuffle ALL active players into random teams. Current assignments will be overwritten. Continue?')) return;

        setLoading(true);
        try {
            const response = await fetch('/api/games/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            success(`Teams Randomized!`);
            onUpdate();
        } catch (err: any) {
            toastError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold italic uppercase flex items-center gap-2">
                    <User className="w-5 h-5 text-pitch-accent" /> Team Management
                </h3>
                <button
                    onClick={handleRandomize}
                    disabled={loading || activePlayers.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-pitch-accent text-pitch-black font-bold uppercase rounded-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Shuffle className="w-4 h-4" /> Randomize Teams
                </button>
            </div>

            <div className={cn(
                "grid gap-4",
                // Dynamic grid cols logic could be improved, but let's assume standard max 4 for now or fallback to responsive
                teams.length >= 3 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-3"
            )}>
                {/* UNASSIGNED */}
                <TeamColumn
                    title="Unassigned"
                    players={unassigned}
                    colorClass="border-gray-700 bg-gray-900/50"
                    headerColor="text-gray-400"
                    onMove={handleMove}
                    target="Unassigned"
                    allTeams={teams}
                    loading={loading}
                />

                {/* DYNAMIC TEAMS */}
                {teams.map(team => {
                    const teamPlayers = activePlayers.filter(p => p.team === team.name);
                    const colorClass = COLOR_MAP[team.color] || 'border-gray-600 bg-gray-800';
                    const headerColor = TEXT_COLOR_MAP[team.color] || 'text-white';

                    return (
                        <TeamColumn
                            key={team.name}
                            title={team.name}
                            players={teamPlayers}
                            colorClass={colorClass}
                            headerColor={headerColor}
                            onMove={handleMove}
                            target={team.name}
                            allTeams={teams}
                            loading={loading}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function TeamColumn({
    title,
    players,
    colorClass,
    headerColor,
    onMove,
    target,
    allTeams,
    loading
}: {
    title: string,
    players: Player[],
    colorClass: string,
    headerColor: string,
    onMove: (id: string, team: string | null) => void,
    target: string, // Team Name or 'Unassigned'
    allTeams: TeamConfig[],
    loading: boolean
}) {
    return (
        <div className={cn("border rounded-sm h-[500px] flex flex-col", colorClass)}>
            <div className="p-3 border-b border-white/5 bg-black/20 flex justify-between items-center">
                <h4 className={cn("font-bold uppercase tracking-wider", headerColor)}>{title}</h4>
                <span className="text-xs text-gray-500 font-mono">{players.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {players.map(p => (
                    <div key={p.id} className="bg-black/40 p-2 rounded border border-white/5 flex items-center justify-between group hover:border-white/20 transition-colors">
                        <div className="truncate">
                            <div className="text-sm font-bold text-gray-200 truncate">{p.name}</div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* If in Unassigned, show buttons for ALL teams */}
                            {target === 'Unassigned' && allTeams.map(team => (
                                <button
                                    key={team.name}
                                    onClick={() => onMove(p.id, team.name)}
                                    disabled={loading}
                                    className={cn(
                                        "p-1 rounded text-[10px] font-bold uppercase w-6 h-6 flex items-center justify-center border",
                                        // Simple heuristic for button colors or just strict map
                                        team.name.includes("A") ? "border-orange-500/50 text-orange-500 hover:bg-orange-500/20" :
                                            team.name.includes("B") ? "border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/20" :
                                                "border-gray-500 text-gray-400 hover:bg-gray-700"
                                    )}
                                    title={`Move to ${team.name}`}
                                >
                                    {team.name.substring(0, 1)}
                                </button>
                            ))}

                            {/* If in a Team, show Move to Unassigned + Move to other teams */}
                            {target !== 'Unassigned' && (
                                <>
                                    <button
                                        onClick={() => onMove(p.id, null)}
                                        disabled={loading}
                                        className="p-1 hover:bg-gray-700 text-gray-400 rounded"
                                        title="Unassign"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                    </button>

                                    {/* Optional: Add direct "Swap" to other teams if space allows, or just Move to... */}
                                    {allTeams.filter(t => t.name !== target).map(otherTeam => (
                                        <button
                                            key={otherTeam.name}
                                            onClick={() => onMove(p.id, otherTeam.name)}
                                            disabled={loading}
                                            className="p-1 hover:bg-white/10 text-white rounded"
                                            title={`Move to ${otherTeam.name}`}
                                        >
                                            <ArrowRight className="w-3 h-3" />
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                ))}
                {players.length === 0 && (
                    <div className="text-center text-gray-600 text-xs italic py-10">Empty</div>
                )}
            </div>
        </div>
    );
}
