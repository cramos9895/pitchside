import { useState } from 'react';
import { User, Shuffle, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { buildHouseTeam } from '@/app/actions/house-team';

interface Player {
    id: string; // booking_id
    userId: string;
    name: string;
    email: string;
    team: 'A' | 'B' | null;
    status: string; // 'active' | 'paid' | 'waitlist'
    payment_status: 'unpaid' | 'pending' | 'verified' | 'refunded';
}

interface TeamConfig {
    name: string;
    color: string;
    limit?: number;
}

interface TeamManagerProps {
    gameId: string;
    players: Player[];
    teams: TeamConfig[];
    onUpdate: () => void;
    onVerifyPayment: (bookingId: string, currentStatus: string) => Promise<void>;
}

const COLOR_MAP: Record<string, string> = {
    'Neon Orange': 'border-orange-500/50 bg-orange-500/10',
    'Neon Blue': 'border-cyan-400/50 bg-cyan-400/10',
    'Neon Green': 'border-[#ccff00]/50 bg-[#ccff00]/10',
    'White': 'border-white/50 bg-white/10',
    'Black': 'border-gray-600 bg-gray-950',
    'Red': 'border-red-500/50 bg-red-500/10',
    'Yellow': 'border-yellow-400/50 bg-yellow-400/10',
    'Light Blue': 'border-blue-400/50 bg-blue-400/10',
    'Pink': 'border-pink-500/50 bg-pink-500/10',
    'Purple': 'border-purple-500/50 bg-purple-500/10',
    'Blue': 'border-blue-600/50 bg-blue-600/10',
    'Grey': 'border-gray-500/50 bg-gray-500/10'
};

const HEX_COLOR_MAP: Record<string, string> = {
    'Neon Orange': '#ff4f00',
    'Neon Blue': '#00ccff',
    'Neon Green': '#ccff00',
    'White': '#ffffff',
    'Black': '#333333',
    'Red': '#ef4444',
    'Yellow': '#eab308',
    'Light Blue': '#60a5fa',
    'Pink': '#ec4899',
    'Purple': '#a855f7',
    'Blue': '#2563eb',
    'Grey': '#6b7280'
};

const TEXT_COLOR_MAP: Record<string, string> = {
    'Neon Orange': 'text-orange-500',
    'Neon Blue': 'text-cyan-400',
    'Neon Green': 'text-[#ccff00]',
    'White': 'text-white',
    'Black': 'text-gray-400',
    'Red': 'text-red-500',
    'Yellow': 'text-yellow-400',
    'Light Blue': 'text-blue-400',
    'Pink': 'text-pink-500',
    'Purple': 'text-purple-500',
    'Blue': 'text-blue-600',
    'Grey': 'text-gray-500'
};

export function TeamManager({ gameId, players, teams, onUpdate }: TeamManagerProps) {
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(false);

    // Filter only active/paid players for team assignment
    const activePlayers = players.filter(p => p.status === 'active' || p.status === 'paid');

    const unassigned = activePlayers.filter(p => !p.team);

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

    const handleBuildHouseTeam = async () => {
        if (!confirm('This will create a new team and automatically draft all pending Free Agents, charging their securely vaulted cards. Continue?')) return;

        setLoading(true);
        try {
            const result = await buildHouseTeam(gameId);

            if (!result.success) {
                throw new Error(result.error);
            }

            success(result.message || 'House Team Built!');
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
                <div className="flex gap-2">
                    <button
                        onClick={handleBuildHouseTeam}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-[#ccff00]/10 border border-[#ccff00]/30 text-[#ccff00] font-bold uppercase rounded-sm hover:bg-[#ccff00] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Auto-draft all pending Free Agents into a new squad"
                    >
                        <Crown className="w-4 h-4" /> Build House Team
                    </button>
                    <button
                        onClick={handleRandomize}
                        disabled={loading || activePlayers.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-pitch-accent text-pitch-black font-bold uppercase rounded-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Shuffle className="w-4 h-4" /> Randomize Teams
                    </button>
                </div>
            </div>

            <div className={cn(
                "grid gap-4",
                teams.length >= 3 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-3"
            )}>
                {/* UNASSIGNED */}
                <TeamColumn
                    title="Unassigned"
                    players={unassigned}
                    colorClass="border-gray-700 bg-gray-900/50"
                    headerColor="text-gray-400"
                    allTeams={teams}
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
                            allTeams={teams}
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
    allTeams,
}: {
    title: string,
    players: Player[],
    colorClass: string,
    headerColor: string,
    allTeams: TeamConfig[],
}) {
    // Find the team config for this column to get limit/color info
    const currentTeamConfig = allTeams.find(t => t.name === title);
    const limit = currentTeamConfig?.limit || 10;
    const percentage = Math.min(100, (players.length / limit) * 100);

    // Use HEX map for inline style background
    const barValues = currentTeamConfig ? HEX_COLOR_MAP[currentTeamConfig.color] : null;

    return (
        <div className={cn("border rounded-sm flex flex-col", colorClass)}>
            <div className="p-3 border-b border-white/5 bg-black/20 flex justify-between items-center relative overflow-hidden">
                {/* Progress Bar */}
                <div
                    className="absolute bottom-0 left-0 h-1 transition-all duration-500"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: barValues || '#4b5563'
                    }}
                />

                <h4 className={cn("font-bold uppercase tracking-wider text-sm", headerColor)}>{title}</h4>
                <div className="flex items-center gap-2 relative z-10">
                    <span className="text-xs text-gray-400 font-mono">
                        {players.length} / {currentTeamConfig?.limit || '-'}
                    </span>
                </div>
            </div>

            <div className="p-2 space-y-1">
                {players.map(p => (
                    <div key={p.id} className="bg-black/40 px-2 py-1.5 rounded border border-white/5 flex items-center gap-2 group hover:border-white/20 transition-colors">
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            p.payment_status === 'verified' ? "bg-green-500" :
                                p.payment_status === 'pending' ? "bg-yellow-500" : "bg-red-500"
                        )} title={`Payment: ${p.payment_status}`} />

                        <div className="text-xs text-gray-200 truncate">{p.name}</div>
                    </div>
                ))}
                {players.length === 0 && (
                    <div className="text-center text-gray-600 text-[10px] italic py-4">Empty</div>
                )}
            </div>
        </div>
    );
}
