'use client';

import React, { useState } from 'react';
import { Users, AlertTriangle, Save, Layout, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFormation, FORMATIONS, PitchFormat } from '@/utils/formations';
import { saveMatchLineup } from '@/app/actions/tactics';

interface TacticalBoardProps {
    matchId: string;
    teamId: string;
    format: string; // '5v5', '7v7', etc.
    roster: any[];
    attendance: any[]; // RSVP data
    initialLineup?: {
        formation: string;
        positions: Record<string, string>;
    };
    isCaptain: boolean;
}

export function TacticalBoard({
    matchId,
    teamId,
    format,
    roster,
    attendance,
    initialLineup,
    isCaptain
}: TacticalBoardProps) {
    const pitchFormat = (format || '5v5') as PitchFormat;
    const [formationKey, setFormationKey] = useState(initialLineup?.formation || Object.keys(FORMATIONS[pitchFormat])[0]);
    const [positions, setPositions] = useState<Record<string, string>>(initialLineup?.positions || {});
    const [isSaving, setIsSaving] = useState(false);

    const formation = getFormation(pitchFormat, formationKey);

    const handlePlayerAssign = (slotId: string, userId: string) => {
        if (!isCaptain) return;
        setPositions(prev => ({
            ...prev,
            [slotId]: userId
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveMatchLineup(matchId, teamId, formationKey, positions);
        } catch (error) {
            console.error(error);
            alert('Failed to save lineup.');
        } finally {
            setIsSaving(false);
        }
    };

    const getPlayerInfo = (userId: string) => {
        const player = roster.find(p => p.user_id === userId);
        const rsvp = attendance.find(a => a.user_id === userId);
        return {
            name: player?.profiles?.full_name || 'Empty',
            isOut: rsvp?.status === 'out',
            avatar: player?.profiles?.avatar_url
        };
    };

    return (
        <div className="space-y-6">
            {/* Controls */}
            {isCaptain && (
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                        <Layout className="w-4 h-4 text-pitch-accent" />
                        <select 
                            value={formationKey}
                            onChange={(e) => setFormationKey(e.target.value)}
                            className="bg-black border border-white/20 text-white text-xs font-black uppercase tracking-widest px-3 py-2 rounded focus:outline-none focus:border-pitch-accent transition-colors"
                        >
                            {Object.keys(FORMATIONS[pitchFormat]).map(key => (
                                <option key={key} value={key}>{FORMATIONS[pitchFormat][key].name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-pitch-accent text-pitch-black px-6 py-2 rounded font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all disabled:opacity-50"
                    >
                        <Save className="w-3 h-3" />
                        {isSaving ? 'Saving...' : 'Save Tactics'}
                    </button>
                </div>
            )}

            {/* Pitch */}
            <div className="relative w-full aspect-square max-w-lg mx-auto bg-[#0a0a0a] border-2 border-white/20 rounded-b-xl overflow-hidden shadow-2xl">
                {/* Pitch Markings */}
                {/* Halfway Circle (Midfield Line) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 aspect-square border border-white/10 rounded-full" />
                <div className="absolute inset-x-0 top-0 border-b border-white/20" /> 

                {/* Penalty Box (Goal Line) */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 aspect-video border-t border-x border-white/10" /> 
                
                {/* Goal Area */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/4 h-12 border-t border-x border-white/10" />

                {/* Formation Nodes */}
                <div 
                    className="relative flex flex-col py-8 px-6 items-center"
                    style={{ height: '100%', width: '100%' }}
                >
                    {/* Outfield Rows Group */}
                    <div 
                        className="flex-1 flex flex-col mb-4"
                        style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}
                    >
                        {formation.rows.map((row, rowIndex) => (
                            <div 
                                key={rowIndex} 
                                style={{ width: '100%', display: 'flex', justifyContent: 'space-evenly', alignItems: 'center' }}
                            >
                                {row.nodes.map(node => {
                                    const assignedUserId = positions[node.id];
                                    const player = assignedUserId ? getPlayerInfo(assignedUserId) : null;
                                    
                                    return (
                                        <div key={node.id} className="flex flex-col items-center gap-2">
                                            <div className="relative">
                                                <button
                                                    disabled={!isCaptain}
                                                    className={cn(
                                                        "w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center transition-all relative overflow-hidden group shadow-lg",
                                                        !assignedUserId ? "bg-white/5 border-dashed border-white/20 hover:border-pitch-accent/50" :
                                                        player?.isOut ? "bg-[#A03232] border-red-500 shadow-[0_0_15px_rgba(160,50,50,0.5)]" : 
                                                        "bg-pitch-accent border-pitch-accent text-pitch-black"
                                                    )}
                                                >
                                                    {player?.avatar ? (
                                                        <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                                                    ) : assignedUserId ? (
                                                        <Users className="w-6 h-6" />
                                                    ) : (
                                                        <span className="text-[10px] font-black opacity-40">{node.label}</span>
                                                    )}

                                                    {player?.isOut && (
                                                        <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center">
                                                            <AlertTriangle className="w-6 h-6 text-white animate-pulse" />
                                                        </div>
                                                    )}

                                                    {isCaptain && (
                                                        <select
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                            value={assignedUserId || ''}
                                                            onChange={(e) => handlePlayerAssign(node.id, e.target.value)}
                                                        >
                                                            <option value="">Select Player</option>
                                                            {roster.map(p => (
                                                                <option key={p.id} value={p.user_id}>{p.profiles.full_name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </button>
                                                
                                                {player?.isOut && (
                                                    <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1 border border-white shadow-lg">
                                                        <AlertTriangle className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <span className={cn(
                                                "text-[9px] font-black uppercase tracking-widest text-center max-w-[80px] truncate px-2 py-0.5 rounded",
                                                player?.isOut ? "bg-red-600 text-white" : "bg-black/50 text-gray-300"
                                            )}>
                                                {player?.name || 'Empty'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Goalkeeper (Always present) */}
                    <div className="flex justify-center w-full mt-auto">
                        <div className="flex flex-col items-center gap-2">
                            <div className="relative">
                                <button
                                    disabled={!isCaptain}
                                    className={cn(
                                        "w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex items-center justify-center transition-all relative overflow-hidden shadow-lg",
                                        !positions['GK'] ? "bg-white/5 border-dashed border-white/20" :
                                        getPlayerInfo(positions['GK']).isOut ? "bg-[#A03232] border-red-500 shadow-[0_0_15px_rgba(160,50,50,0.5)]" :
                                        "bg-orange-500 border-orange-500 text-pitch-black"
                                    )}
                                >
                                    {positions['GK'] && getPlayerInfo(positions['GK']).avatar ? (
                                        <img src={getPlayerInfo(positions['GK']).avatar} alt="GK" className="w-full h-full object-cover" />
                                    ) : (
                                        <ShieldCheck className="w-6 h-6" />
                                    )}
                                    
                                    {isCaptain && (
                                        <select
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            value={positions['GK'] || ''}
                                            onChange={(e) => handlePlayerAssign('GK', e.target.value)}
                                        >
                                            <option value="">Select GK</option>
                                            {roster.map(p => (
                                                <option key={p.id} value={p.user_id}>{p.profiles.full_name}</option>
                                            ))}
                                        </select>
                                    )}
                                </button>
                                {positions['GK'] && getPlayerInfo(positions['GK']).isOut && (
                                    <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1 border border-white">
                                        <AlertTriangle className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </div>
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest text-center max-w-[80px] truncate px-2 py-0.5 rounded",
                                positions['GK'] && getPlayerInfo(positions['GK']).isOut ? "bg-red-600 text-white" : "bg-black/50 text-gray-300"
                            )}>
                                {positions['GK'] ? getPlayerInfo(positions['GK']).name : 'Goalkeeper'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-pitch-accent rounded-full" /> In Formation
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#A03232] rounded-full" /> RSVP: NOT GOING
                </div>
            </div>
        </div>
    );
}
