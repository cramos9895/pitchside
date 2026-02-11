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

interface TeamManagerProps {
    gameId: string;
    players: Player[];
    onUpdate: () => void;
}

export function TeamManager({ gameId, players, onUpdate }: TeamManagerProps) {
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(false);

    // Filter only active/paid players for team assignment
    const activePlayers = players.filter(p => p.status === 'active' || p.status === 'paid');

    const unassigned = activePlayers.filter(p => !p.team);
    const teamA = activePlayers.filter(p => p.team === 'A');
    const teamB = activePlayers.filter(p => p.team === 'B');

    const handleMove = async (bookingId: string, team: 'A' | 'B' | null) => {
        // Optimistic update handled by parent refresh usually, but for speed we might want local state.
        // For now, let's just call API and refresh.
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
        if (!confirm('This will reshuffle ALL active players into two random teams. Current assignments will be overwritten. Continue?')) return;

        setLoading(true);
        try {
            const response = await fetch('/api/games/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            success(`Teams Randomized! A: ${data.teamA}, B: ${data.teamB}`);
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
                    disabled={loading || activePlayers.length < 2}
                    className="flex items-center gap-2 px-4 py-2 bg-pitch-accent text-pitch-black font-bold uppercase rounded-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Shuffle className="w-4 h-4" /> Randomize Teams
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* UNASSIGNED */}
                <TeamColumn
                    title="Unassigned"
                    players={unassigned}
                    colorClass="border-gray-700 bg-gray-900/50"
                    headerColor="text-gray-400"
                    onMove={handleMove}
                    target="Unassigned"
                    loading={loading}
                />

                {/* TEAM A */}
                <TeamColumn
                    title="Team A"
                    players={teamA}
                    colorClass="border-orange-500/30 bg-orange-500/5"
                    headerColor="text-orange-500"
                    onMove={handleMove}
                    target="A"
                    loading={loading}
                />

                {/* TEAM B */}
                <TeamColumn
                    title="Team B"
                    players={teamB}
                    colorClass="border-cyan-500/30 bg-cyan-500/5"
                    headerColor="text-cyan-400"
                    onMove={handleMove}
                    target="B"
                    loading={loading}
                />
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
    loading
}: {
    title: string,
    players: Player[],
    colorClass: string,
    headerColor: string,
    onMove: (id: string, team: 'A' | 'B' | null) => void,
    target: 'A' | 'B' | 'Unassigned',
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
                            {target === 'Unassigned' && (
                                <>
                                    <button onClick={() => onMove(p.id, 'A')} disabled={loading} className="p-1 hover:bg-orange-500/20 text-orange-500 rounded" title="Move to A">A</button>
                                    <button onClick={() => onMove(p.id, 'B')} disabled={loading} className="p-1 hover:bg-cyan-500/20 text-cyan-400 rounded" title="Move to B">B</button>
                                </>
                            )}
                            {target === 'A' && (
                                <>
                                    <button onClick={() => onMove(p.id, null)} disabled={loading} className="p-1 hover:bg-gray-700 text-gray-400 rounded"><RefreshCw className="w-3 h-3" /></button>
                                    <button onClick={() => onMove(p.id, 'B')} disabled={loading} className="p-1 hover:bg-cyan-500/20 text-cyan-400 rounded"><ArrowRight className="w-3 h-3" /></button>
                                </>
                            )}
                            {target === 'B' && (
                                <>
                                    <button onClick={() => onMove(p.id, 'A')} disabled={loading} className="p-1 hover:bg-orange-500/20 text-orange-500 rounded"><ArrowLeft className="w-3 h-3" /></button>
                                    <button onClick={() => onMove(p.id, null)} disabled={loading} className="p-1 hover:bg-gray-700 text-gray-400 rounded"><RefreshCw className="w-3 h-3" /></button>
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
