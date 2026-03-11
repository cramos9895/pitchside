'use client';

import { Trophy, Crown, Loader2, CalendarRange, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function FreeAgentCard({
    player,
    bookingId,
    gameId,
    teamsConfig,
    isCaptain,
    onDraft
}: {
    player: any,
    bookingId?: string,
    gameId?: string,
    teamsConfig?: any[],
    isCaptain?: boolean,
    onDraft?: (bookingId: string, teamAssignment: string) => Promise<void>
}) {
    const winPct = player.matches_played > 0 ? Math.round((player.wins / player.matches_played) * 100) + '%' : '0%';
    const ovr = player.ovr || 70;

    let cardGradient = "bg-gradient-to-br from-[#8c5a3b] via-[#b67352] to-[#512c17] border-[#cc8a63] shadow-[0_0_30px_rgba(182,115,82,0.4)] text-[#ffece0]";
    let holographic = "";
    let textColor = "text-amber-100";
    let accentColor = "text-amber-200/60";

    if (ovr >= 95) { // Diamond
        cardGradient = "bg-gradient-to-br from-[#c0e0ff] via-[#f0f8ff] to-[#a0c0e0] border-[#ffffff] shadow-[0_0_40px_rgba(192,224,255,0.6)] text-blue-900";
        holographic = "after:absolute after:inset-0 after:bg-gradient-to-tr after:from-transparent after:via-white/70 after:to-transparent after:-translate-x-full hover:after:animate-[shimmer_2s_infinite]";
        textColor = "text-blue-900";
        accentColor = "text-blue-800/60";
    } else if (ovr >= 90) { // Gold
        cardGradient = "bg-gradient-to-br from-[#bf953f] via-[#fcf6ba] to-[#b38728] border-[#fcf6ba] shadow-[0_0_35px_rgba(252,246,186,0.5)] text-yellow-900";
        holographic = "after:absolute after:inset-0 after:bg-gradient-to-tr after:from-transparent after:via-white/40 after:to-transparent after:-translate-x-full hover:after:animate-[shimmer_2.5s_infinite]";
        textColor = "text-yellow-900";
        accentColor = "text-yellow-800/60";
    } else if (ovr >= 80) { // Silver
        cardGradient = "bg-gradient-to-br from-[#757f9a] via-[#e2e8f0] to-[#656d81] border-[#f8fafc] shadow-[0_0_30px_rgba(226,232,240,0.3)] text-gray-900";
        holographic = "after:absolute after:inset-0 after:bg-gradient-to-tr after:from-transparent after:via-white/20 after:to-transparent after:-translate-x-full hover:after:animate-[shimmer_3s_infinite]";
        textColor = "text-gray-900";
        accentColor = "text-gray-800/60";
    }

    const [modalOpen, setModalOpen] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [success, setSuccess] = useState(false);

    const [draftTeam, setDraftTeam] = useState<string | null>(null);

    const handleDraftSubmit = async () => {
        if (!draftTeam || !bookingId || !onDraft) return;
        setInviting(true);
        try {
            await onDraft(bookingId, draftTeam);
            setSuccess(true);
            setTimeout(() => {
                setModalOpen(false);
                setSuccess(false);
            }, 2000);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setInviting(false);
        }
    };

    return (
        <>
            <div className="flex flex-col items-center justify-end w-full max-w-[220px] transition-transform duration-500 hover:-translate-y-2 group">
                <div className="w-full relative drop-shadow-lg flex flex-col items-center">

                    {/* The Clipped Shape FUT Card */}
                    <div
                        className={cn(
                            "w-full flex flex-col items-center pt-6 pb-14 px-2 relative overflow-hidden shadow-[inset_0_0_0_4px_rgba(255,255,255,0.3)]",
                            cardGradient,
                            holographic
                        )}
                        style={{
                            clipPath: 'polygon(50% 0%, 100% 10%, 100% 85%, 50% 100%, 0% 85%, 0% 10%)'
                        }}
                    >
                        <div
                            className="absolute inset-1 border border-white/30 mix-blend-overlay pointer-events-none"
                            style={{
                                clipPath: 'polygon(50% 0%, 100% 10%, 100% 85%, 50% 100%, 0% 85%, 0% 10%)'
                            }}
                        />

                        {/* Background Position Watermark */}
                        <div className={cn("font-heading font-black text-6xl absolute top-6 left-1/2 -translate-x-1/2 opacity-10 select-none", textColor)}>
                            {player.position ? player.position.substring(0, 3).toUpperCase() : 'UTL'}
                        </div>

                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-full border-[3px] border-white/50 overflow-hidden shadow-2xl relative z-10 mb-2 bg-pitch-black">
                            {player.avatar_url ? (
                                <img src={player.avatar_url} alt={player.full_name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-3xl text-white/50">
                                    {player.full_name?.charAt(0) || 'P'}
                                </div>
                            )}
                        </div>

                        {/* Name */}
                        <h3 className={cn("font-heading font-black italic uppercase text-lg leading-tight tracking-wider text-center w-full px-1 z-10 truncate", textColor)}>
                            {player.full_name}
                        </h3>

                        {/* Divider */}
                        <div className="w-3/4 h-px bg-black/20 my-2 z-10" />

                        {/* FUT Stats 2x2 Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full px-4 z-10 mb-1 drop-shadow-sm">
                            <div className="flex justify-between items-center whitespace-nowrap">
                                <span className={cn("font-bold text-base", textColor)}>{player.ovr}</span>
                                <span className={cn("uppercase text-[10px] font-bold tracking-widest pl-1", accentColor)}>OVR</span>
                            </div>
                            <div className="flex justify-between items-center whitespace-nowrap">
                                <span className={cn("font-bold text-base", textColor)}>{player.matches_played}</span>
                                <span className={cn("uppercase text-[10px] font-bold tracking-widest pl-1", accentColor)}>GMS</span>
                            </div>
                            <div className="flex justify-between items-center whitespace-nowrap">
                                <span className={cn("font-bold text-base", textColor)}>{player.wins}</span>
                                <span className={cn("uppercase text-[10px] font-bold tracking-widest pl-1", accentColor)}>W</span>
                            </div>
                            <div className="flex justify-between items-center whitespace-nowrap">
                                <span className={cn("font-bold text-base", textColor)}>{winPct}</span>
                                <span className={cn("uppercase text-[10px] font-bold tracking-widest pl-1", accentColor)}>W%</span>
                            </div>
                        </div>

                    </div>

                    {isCaptain && (
                        <button
                            onClick={() => setModalOpen(true)}
                            className="relative -top-8 z-20 bg-pitch-accent text-black font-black uppercase italic tracking-wider px-6 py-2 rounded-full shadow-[0_10px_20px_rgba(204,255,0,0.3)] hover:scale-105 transition-transform flex items-center gap-2"
                        >
                            Draft
                        </button>
                    )}
                </div>
            </div>

            {/* Intercept Modal for Squad Selection */}
            {modalOpen && isCaptain && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    <div className="bg-pitch-card border border-white/10 p-6 rounded-lg shadow-2xl w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-200 text-white">
                        <h2 className="text-xl font-black font-heading italic uppercase mb-2 text-pitch-accent">Draft Free Agent</h2>

                        {success ? (
                            <div className="py-8 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-pitch-accent/20 text-pitch-accent rounded-full flex items-center justify-center mb-4">
                                    <Trophy className="w-8 h-8" />
                                </div>
                                <h3 className="font-bold text-lg mb-1">{player.full_name} Drafted!</h3>
                                <p className="text-pitch-secondary text-sm">Their vaulted card was successfully captured.</p>
                            </div>
                        ) : !teamsConfig || teamsConfig.length === 0 ? (
                            <div className="py-8 text-center bg-black/30 border border-white/5 rounded mt-4">
                                <p className="text-sm font-bold text-red-400">No Squads Configured</p>
                                <p className="text-pitch-secondary text-xs mt-1">This game does not use squads.</p>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                                <p className="text-sm text-pitch-secondary mb-4">
                                    Select which squad you are assigning <span className="text-white font-bold">{player.full_name}</span> to:
                                </p>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    {teamsConfig.map((team, idx) => {
                                        const teamName = team.name || `Squad ${idx + 1}`;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setDraftTeam(teamName)}
                                                className={cn(
                                                    "p-3 rounded border text-center font-bold uppercase text-xs transition-colors",
                                                    draftTeam === teamName ? "bg-pitch-accent text-black border-pitch-accent" : "bg-black/50 border-white/20 text-white hover:border-pitch-accent/50"
                                                )}
                                            >
                                                {teamName}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={handleDraftSubmit}
                                    disabled={!draftTeam || inviting}
                                    className="w-full py-3 bg-pitch-accent text-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors disabled:opacity-50"
                                >
                                    {inviting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Confirm Draft ($)"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
