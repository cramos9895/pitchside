import { useState, useEffect, useMemo } from 'react';
import { User, Shuffle, Crown, Link as LinkIcon, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Player {
    id: string; // booking_id
    userId: string;
    linked_booking_id?: string | null;
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
    const [localPlayers, setLocalPlayers] = useState<Player[]>(players);
    const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
    const [groupMoveState, setGroupMoveState] = useState<{bookingId: string, newTeam: string | null, linkedBookingId: string, limit: number, count: number, exceedsCapacity: boolean} | null>(null);

    const playersJson = JSON.stringify(players);

    useEffect(() => {
        setLocalPlayers(players);
    }, [playersJson]);

    // Filter only active/paid players for team assignment
    const activePlayers = localPlayers.filter(p => p.status === 'active' || p.status === 'paid');

    const linkedGroups = useMemo(() => {
        const counts: Record<string, number> = {};
        activePlayers.forEach(p => {
            if (p.linked_booking_id) {
                counts[p.linked_booking_id] = (counts[p.linked_booking_id] || 0) + 1;
            }
        });
        return counts;
    }, [activePlayers]);

    const unassigned = activePlayers.filter(p => !p.team);

    const executeMoveSingle = async (bookingId: string, newTeam: string | null) => {
        setLocalPlayers(prev => prev.map(p => p.id === bookingId ? { ...p, team: newTeam as any } : p));
        try {
            setLoading(true);
            const { error } = await supabase
                .from('bookings')
                .update({ team_assignment: newTeam })
                .eq('id', bookingId);
            
            if (error) throw error;
            success(`Player moved successfully.`);
            onUpdate();
        } catch (err: any) {
            setLocalPlayers(players);
            toastError(err.message);
        } finally {
            setLoading(false);
            setGroupMoveState(null);
        }
    };

    const executeMoveGroup = async (linkedBookingId: string, newTeam: string | null) => {
        setLocalPlayers(prev => prev.map(p => p.linked_booking_id === linkedBookingId ? { ...p, team: newTeam as any } : p));
        try {
            setLoading(true);
            const { error } = await supabase
                .from('bookings')
                .update({ team_assignment: newTeam })
                .eq('linked_booking_id', linkedBookingId)
                .eq('game_id', gameId);
            
            if (error) throw error;
            success(`Group moved successfully.`);
            onUpdate();
        } catch (err: any) {
            setLocalPlayers(players);
            toastError(err.message);
        } finally {
            setLoading(false);
            setGroupMoveState(null);
        }
    };

    const handleMovePlayerRequest = async (bookingId: string, newTeam: string | null) => {
        const player = activePlayers.find(p => p.id === bookingId);
        if (player?.linked_booking_id && linkedGroups[player.linked_booking_id] > 1) {
            let limit = 11;
            let count = 0;
            if (newTeam) {
                const teamConfig = teams.find(t => t.name === newTeam);
                limit = teamConfig?.limit || 11;
                count = activePlayers.filter(p => p.team === newTeam).length;
            }
            const groupSize = linkedGroups[player.linked_booking_id];
            const exceedsCapacity = newTeam ? (count + groupSize > limit) : false;
            
            setGroupMoveState({
                bookingId,
                newTeam,
                linkedBookingId: player.linked_booking_id,
                limit,
                count,
                exceedsCapacity
            });
        } else {
            executeMoveSingle(bookingId, newTeam);
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

    const handleAutoFill = async () => {
        if (!confirm('This will randomly assign players from the "Unassigned" column into teams that have open slots. Continue?')) return;
        
        setLoading(true);
        try {
            // Localized function: Auto-Fill Open Slots
            const unassignedPlayers = activePlayers.filter(p => !p.team);
            if (unassignedPlayers.length === 0) {
                toastError("No unassigned players to move.");
                setLoading(false);
                return;
            }

            // identify teams with space
            const teamsWithSpace = teams.map(t => {
                const currentCount = activePlayers.filter(p => p.team === t.name).length;
                const limit = t.limit || 11; // default limit to 11 if not set
                return { ...t, openSlots: Math.max(0, limit - currentCount) };
            }).filter(t => t.openSlots > 0);
            
            if (teamsWithSpace.length === 0) {
                toastError("No open slots available on any team.");
                setLoading(false);
                return;
            }

            // shuffle unassigned
            const shuffled = [...unassignedPlayers].sort(() => 0.5 - Math.random());
            
            const updates: { id: string, team_assignment: string }[] = [];
            let currentTeamIndex = 0;
            
            for (const player of shuffled) {
                let assigned = false;
                for (let i = 0; i < teamsWithSpace.length; i++) {
                    const idx = (currentTeamIndex + i) % teamsWithSpace.length;
                    const team = teamsWithSpace[idx];
                    
                    if (team.openSlots > 0) {
                        updates.push({ id: player.id, team_assignment: team.name });
                        team.openSlots--;
                        currentTeamIndex = (idx + 1) % teamsWithSpace.length;
                        assigned = true;
                        break;
                    }
                }
                if (!assigned) break; // no space on any teams
            }

            if (updates.length > 0) {
                // Optimistic update
                setLocalPlayers(prev => {
                    const next = [...prev];
                    for (const u of updates) {
                        const p = next.find(x => x.id === u.id);
                        if (p) p.team = u.team_assignment as any;
                    }
                    return next;
                });
                
                const promises = updates.map(u => 
                    supabase.from('bookings').update({ team_assignment: u.team_assignment }).eq('id', u.id)
                );
                await Promise.all(promises);
                success(`Auto-filled ${updates.length} players into teams!`);
                onUpdate();
            } else {
                toastError("Could not fit any players into teams.");
            }

        } catch (err: any) {
            toastError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h3 className="text-xl font-bold italic uppercase flex items-center gap-2">
                    <User className="w-5 h-5 text-pitch-accent" /> Team Management
                </h3>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button
                        onClick={handleAutoFill}
                        disabled={loading || unassigned.length === 0}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#ccff00]/10 border border-[#ccff00]/30 text-[#ccff00] font-bold uppercase rounded-sm hover:bg-[#ccff00] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
                        title="Randomly assign unassigned players to open slots"
                    >
                        <User className="w-4 h-4" /> Auto-fill
                    </button>
                    <button
                        onClick={handleRandomize}
                        disabled={loading || activePlayers.length === 0}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-pitch-accent text-pitch-black font-bold uppercase rounded-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
                    >
                        <Shuffle className="w-4 h-4" /> Randomize
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
                    colorClass="border-gray-500/30 bg-gray-900/50"
                    headerColor="text-gray-400"
                    allTeams={teams}
                    onMovePlayer={handleMovePlayerRequest}
                    hoveredLinkId={hoveredLinkId}
                    setHoveredLinkId={setHoveredLinkId}
                    linkedGroups={linkedGroups}
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
                            onMovePlayer={handleMovePlayerRequest}
                            hoveredLinkId={hoveredLinkId}
                            setHoveredLinkId={setHoveredLinkId}
                            linkedGroups={linkedGroups}
                        />
                    );
                })}
            </div>

            {/* Custom Group Move Modal */}
            {groupMoveState && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setGroupMoveState(null)} />
                    <div className="relative bg-pitch-card border border-white/10 rounded-sm shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <button onClick={() => setGroupMoveState(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                        
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-pitch-accent/10 text-pitch-accent">
                                <LinkIcon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-heading font-bold uppercase italic text-white mb-2">
                                Group Move Detected
                            </h3>
                            <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                                This player is registered in a group. Do you want to move the entire group or just this individual?
                            </p>

                            {groupMoveState.exceedsCapacity && groupMoveState.newTeam && (
                                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-sm flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div className="text-left">
                                        <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">Capacity Warning</p>
                                        <p className="text-red-400/80 text-xs">Moving this group exceeds the capacity limit for {groupMoveState.newTeam}. You may force the move anyway.</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 w-full">
                                <button
                                    onClick={() => executeMoveGroup(groupMoveState.linkedBookingId, groupMoveState.newTeam)}
                                    className={cn(
                                        "w-full py-3 rounded-sm text-sm font-bold uppercase tracking-widest transition-colors",
                                        groupMoveState.exceedsCapacity 
                                            ? "bg-red-600 hover:bg-red-500 text-white" 
                                            : "bg-pitch-accent hover:bg-white text-pitch-black"
                                    )}
                                    disabled={loading}
                                >
                                    {groupMoveState.exceedsCapacity ? 'Force Move Entire Group' : 'Move Entire Group'}
                                </button>
                                <button
                                    onClick={() => executeMoveSingle(groupMoveState.bookingId, groupMoveState.newTeam)}
                                    className="w-full py-3 border border-white/10 rounded-sm text-sm font-bold uppercase tracking-widest text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                                    disabled={loading}
                                >
                                    Just This Player
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TeamColumn({
    title,
    players,
    colorClass,
    headerColor,
    allTeams,
    onMovePlayer,
    hoveredLinkId,
    setHoveredLinkId,
    linkedGroups
}: {
    title: string,
    players: Player[],
    colorClass: string,
    headerColor: string,
    allTeams: TeamConfig[],
    onMovePlayer: (id: string, team: string | null) => void;
    hoveredLinkId: string | null;
    setHoveredLinkId: (id: string | null) => void;
    linkedGroups: Record<string, number>;
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
                {players.map(p => {
                    const isGrouped = p.linked_booking_id && linkedGroups[p.linked_booking_id] > 1;
                    const isHovered = isGrouped && hoveredLinkId === p.linked_booking_id;
                    
                    return (
                        <DropdownMenu key={p.id}>
                            <DropdownMenuTrigger asChild>
                                <div 
                                    className={cn(
                                        "px-2 py-1.5 rounded border flex items-center gap-2 group transition-all cursor-pointer duration-200",
                                        isHovered 
                                            ? "bg-[#ccff00]/10 border-[#ccff00] ring-1 ring-[#ccff00] scale-[1.02]" 
                                            : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5"
                                    )}
                                    onMouseEnter={() => { if (isGrouped) setHoveredLinkId(p.linked_booking_id!); }}
                                    onMouseLeave={() => setHoveredLinkId(null)}
                                >
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full shrink-0",
                                        p.payment_status === 'verified' ? "bg-green-500" :
                                            p.payment_status === 'pending' ? "bg-yellow-500" : "bg-red-500"
                                    )} title={`Payment: ${p.payment_status}`} />
                                    
                                    {isGrouped && (
                                        <LinkIcon className={cn("w-3 h-3 shrink-0", isHovered ? "text-[#ccff00]" : "text-[#ccff00] opacity-80")} />
                                    )}

                                    <div className={cn("text-xs truncate flex-1 text-left", isHovered ? "text-white font-bold" : "text-gray-200")}>{p.name}</div>
                                </div>
                            </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48">
                            <div className="text-xs text-gray-500 font-bold px-2 py-1.5 uppercase tracking-wider">Move to...</div>
                            {title !== "Unassigned" && (
                                <DropdownMenuItem onClick={() => onMovePlayer(p.id, null)} className="font-bold cursor-pointer">
                                    Unassigned
                                </DropdownMenuItem>
                            )}
                            {allTeams.map(t => {
                                if (t.name === title) return null;
                                return (
                                    <DropdownMenuItem key={t.name} onClick={() => onMovePlayer(p.id, t.name)} className="font-bold cursor-pointer">
                                        {t.name}
                                    </DropdownMenuItem>
                                )
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    )
                })}
                {players.length === 0 && (
                    <div className="text-center text-gray-600 text-[10px] italic py-4">Empty</div>
                )}
            </div>
        </div>
    );
}
