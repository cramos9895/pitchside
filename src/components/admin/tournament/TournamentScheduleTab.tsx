import { useState } from 'react';
import { Trophy, AlertTriangle, Users, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { generateTournamentSchedule, DraftMatch, calculateStandings } from '@/utils/pickupTournamentScheduler';
import Link from 'next/link';

export function TournamentScheduleTab({ 
    matches = [], 
    teams = [], 
    gameId, 
    game, 
    registrations = [], 
    onRefresh 
}: any) {
    const { success, error: toastError } = useToast();
    
    // Derived state
    const activePlayers = registrations.filter((b: any) => 
        ['active', 'paid', 'confirmed', 'registered', 'pending'].includes(b.status) || 
        b.roster_status === 'confirmed'
    );
    const uniqueRegisteredTeamIds = new Set(activePlayers.map((p: any) => p.team_id).filter(Boolean));
    const registeredTeamsCount = uniqueRegisteredTeamIds.size;
    
    // Match Segmentation
    const groupMatches = matches.filter((m: any) => !m.is_playoff).sort((a: any, b: any) => {
        const timeA = new Date(a.start_time).getTime();
        const timeB = new Date(b.start_time).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
    });
    
    const playoffMatches = matches.filter((m: any) => m.is_playoff).sort((a: any, b: any) => {
        const timeA = new Date(a.start_time).getTime();
        const timeB = new Date(b.start_time).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
    });
    
    const allGroupMatchesCompleted = groupMatches.length > 0 && groupMatches.every((m: any) => m.status === 'completed');
    const hasStarted = matches.some((m: any) => m.status === 'completed' || (m.home_score || 0) > 0 || (m.away_score || 0) > 0);

    // State
    const [draftSchedule, setDraftSchedule] = useState<DraftMatch[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isGeneratingPlayoffs, setIsGeneratingPlayoffs] = useState(false);
    const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
    const [editTime, setEditTime] = useState("");
    const [editField, setEditField] = useState("");
    const [editHomeTeam, setEditHomeTeam] = useState("");
    const [editAwayTeam, setEditAwayTeam] = useState("");
    
    // Admin Override for Minimum Games (Local to scheduler)
    const [localMinGames, setLocalMinGames] = useState<number>(game.minimum_games_per_team || 3);
    const [excludedTeams, setExcludedTeams] = useState<Set<string>>(new Set());

    // --- ACTIONS ---
    const handleGenerateDraft = () => {
        setIsGenerating(true);
        try {
            const registeredTeams = teams.filter((t: any) => uniqueRegisteredTeamIds.has(t.id) && !excludedTeams.has(t.name));
            const schedule = generateTournamentSchedule({
                teams: registeredTeams,
                amountOfFields: game.amount_of_fields || 1,
                halfLength: game.half_length || 20,
                halftimeLength: game.halftime_length || 5,
                breakBetweenGames: game.break_between_games || 5,
                earliestStartTime: game.start_time,
                endTime: game.end_time || "23:59:00",
                tournamentStyle: game.tournament_style || 'group_stage',
                minGamesPerTeam: localMinGames
            });
            setDraftSchedule(schedule);
            success("Draft schedule generated successfully!");
        } catch (err: any) {
            toastError("Failed to generate schedule: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublishSchedule = async () => {
        if (draftSchedule.length === 0) return;
        setIsPublishing(true);
        try {
            const matchesToInsert = draftSchedule.map(m => ({
                game_id: gameId,
                status: 'scheduled',
                home_team: m.home_team,
                away_team: m.away_team,
                start_time: m.start_time,
                field_name: m.field_name,
                is_playoff: m.is_playoff,
                match_style: game.match_style || 'tournament'
            }));
            const { error } = await supabase.from('matches').insert(matchesToInsert);
            if (error) throw error;
            success("Schedule Locked and Published!");
            setDraftSchedule([]);
            onRefresh();
        } catch(err: any) {
            toastError(err.message);
        } finally {
            setIsPublishing(false);
        }
    };

    const handleGeneratePlayoffs = async () => {
        if (!allGroupMatchesCompleted) return;
        setIsGeneratingPlayoffs(true);
        try {
            const currentStandings = calculateStandings(teams, groupMatches);
            const numAdvance = game.teams_into_playoffs || 4;
            const topTeams = currentStandings.slice(0, numAdvance).map(s => s.name);
            const hasBye = game.has_playoff_bye || false;

            let playoffMatchesToCreate: any[] = [];
            
            // Bracket Logic
            if (hasBye && numAdvance === 5) {
                playoffMatchesToCreate = [
                    { home: topTeams[3], away: topTeams[4], label: 'Wildcard Match' }, // 4th vs 5th
                    { home: topTeams[0], away: 'TBD (Winner Wildcard)', label: 'Semi-Final 1' }, // 1st vs Winner
                    { home: topTeams[1], away: topTeams[2], label: 'Semi-Final 2' } // 2nd vs 3rd
                ];
            } else if (hasBye && numAdvance === 9) {
                playoffMatchesToCreate = [
                    { home: topTeams[7], away: topTeams[8], label: 'Wildcard Match' }, // 8th vs 9th
                    { home: topTeams[0], away: 'TBD (Winner Wildcard)', label: 'Quarter-Final 1' }, // 1st vs Winner
                    { home: topTeams[1], away: topTeams[6], label: 'Quarter-Final 2' },
                    { home: topTeams[2], away: topTeams[5], label: 'Quarter-Final 3' },
                    { home: topTeams[3], away: topTeams[4], label: 'Quarter-Final 4' }
                ];
            } else if (numAdvance === 4) {
                playoffMatchesToCreate = [
                    { home: topTeams[0], away: topTeams[3], label: 'Semi-Final 1' },
                    { home: topTeams[1], away: topTeams[2], label: 'Semi-Final 2' }
                ];
            } else if (numAdvance === 8) {
                playoffMatchesToCreate = [
                    { home: topTeams[0], away: topTeams[7], label: 'Quarter-Final 1' },
                    { home: topTeams[1], away: topTeams[6], label: 'Quarter-Final 2' },
                    { home: topTeams[2], away: topTeams[5], label: 'Quarter-Final 3' },
                    { home: topTeams[3], away: topTeams[4], label: 'Quarter-Final 4' }
                ];
            } else {
                for (let i = 0; i < Math.floor(numAdvance / 2); i++) {
                    playoffMatchesToCreate.push({ 
                        home: topTeams[i], 
                        away: topTeams[numAdvance - 1 - i], 
                        label: `Elimination ${i + 1}` 
                    });
                }
            }

            const baseTime = new Date(groupMatches[groupMatches.length - 1]?.start_time || Date.now());
            const finalMatches = playoffMatchesToCreate.map((m, i) => ({
                game_id: gameId,
                status: 'scheduled',
                home_team: m.home,
                away_team: m.away,
                start_time: new Date(baseTime.getTime() + (i * 30 * 60000) + (15 * 60000)).toISOString(), 
                field_name: game.amount_of_fields > 1 ? `Field ${(i % game.amount_of_fields) + 1}` : 'Field 1',
                is_playoff: true,
                match_style: 'tournament'
            }));

            const { error: insertError } = await supabase.from('matches').insert(finalMatches);
            if (insertError) throw insertError;

            success(`Bracket generated! ${finalMatches.length} playoff matches seeded.`);
            onRefresh();
        } catch (err: any) {
            toastError("Playoff Error: " + err.message);
        } finally {
            setIsGeneratingPlayoffs(false);
        }
    };

    const handleRegenerate = async () => {
        if (hasStarted) {
            toastError("Safety Lock: Cannot regenerate once scores are recorded.");
            return;
        }
        if (!confirm("Are you sure you want to PERMANENTLY delete the current schedule and start over? This cannot be undone.")) return;
        try {
            const { error } = await supabase.from('matches').delete().eq('game_id', gameId);
            if (error) throw error;
            success("Schedule cleared. You can now generate a new one.");
            onRefresh();
        } catch (err: any) {
            toastError("Failed to clear schedule: " + err.message);
        }
    };

    const startEditing = (match: any) => {
        setEditingMatchId(match.id);
        const tempDate = new Date(match.start_time);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formattedStr = `${tempDate.getFullYear()}-${pad(tempDate.getMonth()+1)}-${pad(tempDate.getDate())}T${pad(tempDate.getHours())}:${pad(tempDate.getMinutes())}`;
        
        setEditTime(formattedStr);
        setEditField(match.field_name);
        setEditHomeTeam(match.home_team);
        setEditAwayTeam(match.away_team);
    };
    
    const saveEdit = (id: string) => {
        setDraftSchedule(prev => prev.map(m => m.id === id ? { ...m, start_time: new Date(editTime).toISOString(), field_name: editField, home_team: editHomeTeam, away_team: editAwayTeam } : m));
        setEditingMatchId(null);
    };

    const handleDeleteDraftMatch = (id: string) => {
        if (!confirm("Are you sure you want to remove this match from the draft?")) return;
        setDraftSchedule(prev => prev.filter(m => m.id !== id));
        setEditingMatchId(null);
    };

    const handleLiveSave = async (id: string) => {
        try {
            const { error } = await supabase
                .from('matches')
                .update({ 
                    start_time: new Date(editTime).toISOString(), 
                    field_name: editField,
                    home_team: editHomeTeam,
                    away_team: editAwayTeam
                })
                .eq('id', id);
            if (error) throw error;
            success("Match updated live.");
            setEditingMatchId(null);
            onRefresh();
        } catch (err: any) {
            toastError("Failed to update: " + err.message);
        }
    };

    const handleDeleteLiveMatch = async (id: string) => {
        if (!confirm("Are you sure you want to permanently delete this scheduled match? This cannot be undone.")) return;
        try {
            const { error } = await supabase.from('matches').delete().eq('id', id);
            if (error) throw error;
            success("Match deleted.");
            setEditingMatchId(null);
            onRefresh();
        } catch (err: any) {
            toastError("Failed to delete match: " + err.message);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="font-heading text-2xl font-bold italic uppercase text-white">
                            Match Engine
                        </h2>
                        <p className="text-sm text-pitch-secondary">
                            {matches.length > 0 
                                ? `${groupMatches.length} Group Games | ${playoffMatches.length} Playoff Games`
                                : 'Generate and adjust matches locally before publishing.'}
                        </p>
                    </div>
                    {matches.length > 0 && (
                        <a 
                            href={`/admin/games/${gameId}/display`} 
                            target="_blank" 
                            className="flex items-center gap-2 px-4 py-2 bg-pitch-accent/10 border border-pitch-accent/30 text-pitch-accent rounded text-[10px] font-black uppercase tracking-widest hover:bg-pitch-accent hover:text-black transition-all"
                        >
                            <ExternalLink className="w-3 h-3" /> Launch Projector Display
                        </a>
                    )}
                </div>
                <div className="flex gap-3">
                    {matches.length > 0 && !hasStarted && (
                        <button
                            onClick={handleRegenerate}
                            className="px-6 py-3 border border-red-500/50 text-red-500 hover:bg-red-500/10 font-bold uppercase tracking-wider rounded transition-colors text-sm"
                        >
                            Regenerate Schedule
                        </button>
                    )}
                    {hasStarted && (
                        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 rounded">
                            <AlertTriangle className="w-3 h-3" /> Schedule Locked (Live)
                        </div>
                    )}
                    {matches.length === 0 && (
                        <button
                            onClick={handleGenerateDraft}
                            disabled={isGenerating || draftSchedule.length > 0}
                            className="px-6 py-3 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded transition-colors hover:bg-white disabled:opacity-50 shrink-0 whitespace-nowrap"
                        >
                            {isGenerating ? 'Drafting...' : 'Generate Draft Schedule'}
                        </button>
                    )}
                </div>
            </div>

            {/* DYNAMIC VALIDATION WIDGET (Only for Draft Mode) */}
            {matches.length === 0 && draftSchedule.length === 0 && (
                <div className="bg-white/5 border border-white/10 p-4 rounded-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
                    <div>
                        <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest mb-1">Registered Teams</label>
                        <p className="text-xl font-bold text-white">{registeredTeamsCount}</p>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest mb-1">Max Possible Games</label>
                        <p className="text-xl font-bold text-pitch-accent">{Math.max(0, Math.ceil(registeredTeamsCount / 2) - 1)}</p>
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-[10px] uppercase font-black text-pitch-accent tracking-widest mb-2">Override Minimum Games (Group Stage)</label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="number"
                                value={localMinGames}
                                onChange={(e) => setLocalMinGames(Number(e.target.value))}
                                className="w-20 bg-black border border-pitch-accent/30 rounded p-2 text-white font-bold text-center focus:border-pitch-accent transition-colors"
                            />
                            <div className="flex-1">
                                {localMinGames > (Math.ceil(registeredTeamsCount / 2) - 1) ? (
                                    <div className="flex items-start gap-2 text-red-500 animate-in fade-in slide-in-from-left-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <p className="text-[10px] leading-tight uppercase font-bold">Impossible: Not enough opponents. Please reduce to {Math.max(0, Math.ceil(registeredTeamsCount / 2) - 1)} or less.</p>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-gray-500 italic">Adjusting this only affects the current draft session.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-4 mt-4 pt-4 border-t border-white/5">
                        <label className="block text-[10px] uppercase font-black text-gray-500 tracking-widest mb-2">Participating Teams</label>
                        <div className="flex flex-wrap gap-2">
                            {teams.filter((t: any) => uniqueRegisteredTeamIds.has(t.id)).map((t: any) => {
                                const isExcluded = excludedTeams.has(t.name);
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            const next = new Set(excludedTeams);
                                            if (isExcluded) next.delete(t.name);
                                            else next.add(t.name);
                                            setExcludedTeams(next);
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors border",
                                            isExcluded 
                                                ? "bg-red-500/10 border-red-500/30 text-red-500 line-through" 
                                                : "bg-green-500/10 border-green-500/30 text-green-500"
                                        )}
                                    >
                                        {t.name}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-gray-500 italic mt-2">Click a team to exclude them from the schedule generator (e.g., if they no-showed).</p>
                    </div>
                </div>
            )}

            {/* MATCH ENGINE LISTS */}
            {matches.length === 0 && draftSchedule.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-sm bg-black/20">
                    <Trophy className="w-12 h-12 text-gray-600 mb-4" />
                    <h2 className="text-xl font-bold uppercase italic text-gray-400 mb-2">No Draft Generated</h2>
                    <p className="text-gray-500 text-sm max-w-md text-center">
                        Click "Generate Draft Schedule" to build the round-robin matrix based on your configured tournament variables.
                    </p>
                </div>
            ) : (
                <div className="space-y-12">
                    {/* GROUP STAGE */}
                    {(groupMatches.length > 0 || (draftSchedule.length > 0 && !draftSchedule[0].is_playoff)) && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <h3 className="font-heading text-xl font-bold italic uppercase text-pitch-secondary flex items-center gap-2">
                                    <Users className="w-5 h-5" /> Group Stage
                                </h3>
                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                                    {groupMatches.filter((m: any) => m.status === 'completed').length} / {groupMatches.length} Matches Finished
                                </div>
                            </div>
                            <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                                <div className="flex flex-col gap-3 min-w-[1000px]">
                                    {(draftSchedule.length > 0 ? draftSchedule : groupMatches).map((match: any) => {
                                        const isDraft = draftSchedule.length > 0;
                                        const isEditing = editingMatchId === match.id;
                                        const isTBD = match.home_team?.includes('TBD') || match.home_team?.includes('Winner') || 
                                                     match.away_team?.includes('TBD') || match.away_team?.includes('Winner');

                                        if (isEditing) {
                                            return (
                                                <div key={match.id} className="bg-gray-900 border border-pitch-accent/50 p-4 rounded-sm grid grid-cols-[100px_minmax(150px,1fr)_100px_150px] items-center gap-4 bg-pitch-accent/5 shadow-[0_0_20px_rgba(204,255,0,0.05)]">
                                                    {/* Time & Field Editing */}
                                                    <div className="flex flex-col gap-2 min-w-[160px]">
                                                        <input type="datetime-local" value={editTime} onChange={e => setEditTime(e.target.value)} className="bg-black border border-white/20 rounded p-1 text-xs text-white" />
                                                        <input type="text" value={editField} onChange={e => setEditField(e.target.value)} className="bg-black border border-white/20 rounded p-1 text-xs text-white" placeholder="Field Name" />
                                                    </div>

                                                    {/* Score Line Editing (Teams) */}
                                                    <div className="flex items-center justify-between px-8">
                                                        <div className="flex-1 text-right min-w-0">
                                                            <select value={editHomeTeam} onChange={e => setEditHomeTeam(e.target.value)} className="w-full bg-black border border-white/20 rounded p-1 text-xs text-white">
                                                                {teams.filter((t: any) => uniqueRegisteredTeamIds.has(t.id)).map((t: any) => (
                                                                    <option key={t.id} value={t.name}>{t.name}</option>
                                                                ))}
                                                                <option value="TBD">TBD</option>
                                                                {editHomeTeam !== 'TBD' && !teams.find((t:any) => t.name === editHomeTeam) && <option value={editHomeTeam}>{editHomeTeam}</option>}
                                                            </select>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-4 px-6">
                                                            <span className="text-gray-700 font-black text-xl">vs</span>
                                                        </div>

                                                        <div className="flex-1 text-left min-w-0">
                                                            <select value={editAwayTeam} onChange={e => setEditAwayTeam(e.target.value)} className="w-full bg-black border border-white/20 rounded p-1 text-xs text-white">
                                                                {teams.filter((t: any) => uniqueRegisteredTeamIds.has(t.id)).map((t: any) => (
                                                                    <option key={t.id} value={t.name}>{t.name}</option>
                                                                ))}
                                                                <option value="TBD">TBD</option>
                                                                {editAwayTeam !== 'TBD' && !teams.find((t:any) => t.name === editAwayTeam) && <option value={editAwayTeam}>{editAwayTeam}</option>}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="col-start-4 flex flex-col items-end gap-2">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => isDraft ? saveEdit(match.id) : handleLiveSave(match.id)} className="bg-pitch-accent text-black px-3 py-1 rounded text-[10px] font-black uppercase">Save</button>
                                                            <button onClick={() => setEditingMatchId(null)} className="bg-white/10 text-white px-3 py-1 rounded text-[10px] font-black uppercase">Cancel</button>
                                                        </div>
                                                        <button onClick={() => isDraft ? handleDeleteDraftMatch(match.id) : handleDeleteLiveMatch(match.id)} className="text-red-500 hover:text-red-400 text-[10px] font-bold uppercase flex items-center gap-1">
                                                            <Trash2 className="w-3 h-3" /> Delete Match
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={match.id} className={cn(
                                                "bg-gray-900 border border-gray-800 p-4 rounded-sm grid grid-cols-[100px_minmax(150px,1fr)_100px_150px] items-center gap-4 transition-all hover:border-white/10",
                                                isEditing && "border-pitch-accent/50 bg-pitch-accent/5 shadow-[0_0_20px_rgba(204,255,0,0.05)]"
                                            )}>
                                                {/* Time & Field */}
                                                <div className="flex items-center gap-4 min-w-[160px]">
                                                    <div className="bg-black/40 p-2 rounded border border-white/5 text-center min-w-[80px]">
                                                        <div className="text-[10px] font-black uppercase text-pitch-accent">Start</div>
                                                        <div className="text-sm font-bold">{new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </div>
                                                    <div className="text-left border-l border-white/10 pl-4">
                                                        <div className="text-[10px] font-black uppercase text-gray-500">Field</div>
                                                        <div className="text-sm font-bold text-gray-300">{match.field_name}</div>
                                                        {match.group_name && (
                                                            <div className="text-[9px] font-bold text-pitch-accent uppercase">{match.group_name}</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Score Line */}
                                                <div className="flex items-center justify-between px-8">
                                                    <div className="flex-1 text-right min-w-0">
                                                        <h3 className="text-sm md:text-base font-black uppercase tracking-tight truncate text-white" title={match.home_team}>
                                                            {match.home_team}
                                                        </h3>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-4 px-6">
                                                        <span className="text-3xl font-black text-pitch-accent tabular-nums">{match.home_score ?? 0}</span>
                                                        <span className="text-gray-700 font-black text-xl">-</span>
                                                        <span className="text-3xl font-black text-pitch-accent tabular-nums">{match.away_score ?? 0}</span>
                                                    </div>

                                                    <div className="flex-1 text-left min-w-0">
                                                        <h3 className="text-sm md:text-base font-black uppercase tracking-tight truncate text-white" title={match.away_team}>
                                                            {match.away_team}
                                                        </h3>
                                                    </div>
                                                </div>

                                                {/* Mini Timer */}
                                                <div className="flex flex-col items-center justify-center border-l border-white/5">
                                                    <div className={cn(
                                                        "text-lg font-black tabular-nums tracking-widest",
                                                        match.timer_status === 'running' ? "text-pitch-accent animate-pulse" : "text-gray-600"
                                                    )}>
                                                        {match.timer_status === 'completed' ? 'DONE' : (match.match_phase === 'post_game' ? 'END' : 'LIVE')}
                                                    </div>
                                                    <div className="text-[10px] font-black uppercase tracking-tighter text-gray-500">
                                                        {match.match_phase?.replace('_', ' ') || 'scheduled'}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center justify-end gap-2">
                                                    {!isDraft && (
                                                        <Link 
                                                            href={`/admin/matches/${match.id}/manage`}
                                                            className="flex-1 bg-white/5 border border-white/10 hover:bg-pitch-accent hover:text-black hover:border-pitch-accent py-2 px-4 rounded text-center text-[10px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Manage Match
                                                        </Link>
                                                    )}
                                                    <button 
                                                        onClick={() => startEditing(match)}
                                                        className="p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Finalize Group Stage & Generate Playoffs */}
                            {groupMatches.length > 0 && playoffMatches.length === 0 && (
                                <div className="mt-8 p-6 bg-pitch-accent/5 border border-pitch-accent/10 rounded-sm text-center">
                                    <Trophy className="w-12 h-12 text-pitch-accent mx-auto mb-4 opacity-50" />
                                    <h3 className="text-xl font-black italic uppercase text-white mb-2">Group Stage Conclusion</h3>
                                    <p className="text-gray-400 text-xs max-w-md mx-auto mb-6 uppercase tracking-wider">
                                        Once all {groupMatches.length} group matches are completed, you can automatically generate the seeded playoff bracket based on real-time standings.
                                    </p>
                                    <button 
                                        onClick={handleGeneratePlayoffs}
                                        disabled={!allGroupMatchesCompleted || isGeneratingPlayoffs}
                                        className={cn(
                                            "px-8 py-4 font-black text-lg uppercase tracking-wider rounded transition-all relative overflow-hidden",
                                            allGroupMatchesCompleted 
                                                ? "bg-pitch-accent text-black shadow-[0_0_30px_rgba(204,255,0,0.3)] hover:scale-105 active:scale-95" 
                                                : "bg-gray-800 text-gray-500 cursor-not-allowed grayscale"
                                        )}
                                    >
                                        {isGeneratingPlayoffs ? "Generating Bracket..." : (
                                            <div className="flex items-center gap-3">
                                                <Trophy className="w-5 h-5" /> Finalize Group Stage & Generate Playoffs
                                            </div>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PLAYOFF BRACKET */}
                    {playoffMatches.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-pitch-accent/20 pb-2">
                                <h3 className="font-heading text-xl font-bold italic uppercase text-pitch-accent flex items-center gap-2">
                                    <Trophy className="w-5 h-5" /> Playoff Bracket
                                </h3>
                            </div>
                            <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                                <div className="flex flex-col gap-3 min-w-[1000px]">
                                    {playoffMatches.map((match: any) => {
                                        const isEditing = editingMatchId === match.id;
                                        const isTBD = match.home_team?.includes('TBD') || match.home_team?.includes('Winner') || 
                                                     match.away_team?.includes('TBD') || match.away_team?.includes('Winner');

                                        if (isEditing) {
                                            return (
                                                <div key={match.id} className="bg-gray-900 border border-pitch-accent/50 p-4 rounded-sm grid grid-cols-[100px_minmax(150px,1fr)_100px_150px] items-center gap-4 bg-pitch-accent/5 shadow-[0_0_20px_rgba(204,255,0,0.05)] relative">
                                                    <div className="absolute top-0 right-0 py-0.5 px-2 bg-pitch-accent/10 text-[8px] font-black uppercase text-pitch-accent tracking-[0.2em] rounded-bl">
                                                        Elimination Match
                                                    </div>
                                                    {/* Time & Field Editing */}
                                                    <div className="flex flex-col gap-2 min-w-[160px]">
                                                        <input type="datetime-local" value={editTime} onChange={e => setEditTime(e.target.value)} className="bg-black border border-white/20 rounded p-1 text-xs text-white" />
                                                        <input type="text" value={editField} onChange={e => setEditField(e.target.value)} className="bg-black border border-white/20 rounded p-1 text-xs text-white" placeholder="Field Name" />
                                                    </div>

                                                    {/* Score Line Editing (Teams) */}
                                                    <div className="flex items-center justify-between px-8">
                                                        <div className="flex-1 text-right min-w-0">
                                                            <select value={editHomeTeam} onChange={e => setEditHomeTeam(e.target.value)} className="w-full bg-black border border-white/20 rounded p-1 text-xs text-white">
                                                                {teams.filter((t: any) => uniqueRegisteredTeamIds.has(t.id)).map((t: any) => (
                                                                    <option key={t.id} value={t.name}>{t.name}</option>
                                                                ))}
                                                                <option value="TBD">TBD</option>
                                                                {editHomeTeam !== 'TBD' && !teams.find((t:any) => t.name === editHomeTeam) && <option value={editHomeTeam}>{editHomeTeam}</option>}
                                                            </select>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-4 px-6">
                                                            <span className="text-gray-700 font-black text-xl">vs</span>
                                                        </div>

                                                        <div className="flex-1 text-left min-w-0">
                                                            <select value={editAwayTeam} onChange={e => setEditAwayTeam(e.target.value)} className="w-full bg-black border border-white/20 rounded p-1 text-xs text-white">
                                                                {teams.filter((t: any) => uniqueRegisteredTeamIds.has(t.id)).map((t: any) => (
                                                                    <option key={t.id} value={t.name}>{t.name}</option>
                                                                ))}
                                                                <option value="TBD">TBD</option>
                                                                {editAwayTeam !== 'TBD' && !teams.find((t:any) => t.name === editAwayTeam) && <option value={editAwayTeam}>{editAwayTeam}</option>}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="col-start-4 flex flex-col items-end gap-2">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleLiveSave(match.id)} className="bg-pitch-accent text-black px-3 py-1 rounded text-[10px] font-black uppercase">Save</button>
                                                            <button onClick={() => setEditingMatchId(null)} className="bg-white/10 text-white px-3 py-1 rounded text-[10px] font-black uppercase">Cancel</button>
                                                        </div>
                                                        <button onClick={() => handleDeleteLiveMatch(match.id)} className="text-red-500 hover:text-red-400 text-[10px] font-bold uppercase flex items-center gap-1">
                                                            <Trash2 className="w-3 h-3" /> Delete Match
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={match.id} className={cn(
                                                "bg-gray-900 border border-pitch-accent/10 p-4 rounded-sm grid grid-cols-[100px_minmax(150px,1fr)_100px_150px] items-center gap-4 transition-all hover:border-pitch-accent/30 relative",
                                                isEditing && "border-pitch-accent/50 bg-pitch-accent/5 shadow-[0_0_20px_rgba(204,255,0,0.05)]"
                                            )}>
                                                {/* Playoff Label */}
                                                <div className="absolute top-0 right-0 py-0.5 px-2 bg-pitch-accent/10 text-[8px] font-black uppercase text-pitch-accent tracking-[0.2em] rounded-bl">
                                                    Elimination Match
                                                </div>

                                                {/* Time & Field */}
                                                <div className="flex items-center gap-4 min-w-[160px]">
                                                    <div className="bg-black/60 p-2 rounded border border-pitch-accent/20 text-center min-w-[80px]">
                                                        <div className="text-[10px] font-black uppercase text-pitch-accent">K/O</div>
                                                        <div className="text-sm font-bold">{new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </div>
                                                    <div className="text-left border-l border-white/10 pl-4">
                                                        <div className="text-[10px] font-black uppercase text-gray-500">Field</div>
                                                        <div className="text-sm font-bold text-gray-300">{match.field_name}</div>
                                                    </div>
                                                </div>

                                                {/* Score Line */}
                                                <div className="flex items-center justify-between px-8">
                                                    <div className="flex-1 text-right min-w-0">
                                                        <h3 className="text-sm md:text-base font-black uppercase tracking-tight truncate text-white" title={match.home_team}>
                                                            {match.home_team}
                                                        </h3>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-4 px-6">
                                                        {!isTBD ? (
                                                            <>
                                                                <span className="text-3xl font-black text-pitch-accent tabular-nums">{match.home_score ?? 0}</span>
                                                                <span className="text-pitch-accent/30 font-black text-xl">-</span>
                                                                <span className="text-3xl font-black text-pitch-accent tabular-nums">{match.away_score ?? 0}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-gray-600 font-bold uppercase text-[10px] tracking-widest whitespace-nowrap">TBD vs TBD</span>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 text-left min-w-0">
                                                        <h3 className="text-sm md:text-base font-black uppercase tracking-tight truncate text-white" title={match.away_team}>
                                                            {match.away_team}
                                                        </h3>
                                                    </div>
                                                </div>

                                                {/* Mini Timer */}
                                                <div className="flex flex-col items-center justify-center border-l border-white/5">
                                                    <div className={cn(
                                                        "text-lg font-black tabular-nums tracking-widest",
                                                        match.timer_status === 'running' ? "text-pitch-accent animate-pulse" : "text-gray-600"
                                                    )}>
                                                        {match.status === 'completed' ? 'DONE' : (match.match_phase === 'post_game' ? 'END' : 'LIVE')}
                                                    </div>
                                                    <div className="text-[10px] font-black uppercase tracking-tighter text-gray-500">
                                                        {match.match_phase?.replace('_', ' ') || 'scheduled'}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link 
                                                        href={`/admin/matches/${match.id}/manage`}
                                                        className="flex-1 bg-white/5 border border-white/10 hover:bg-pitch-accent hover:text-black hover:border-pitch-accent py-2 px-4 rounded text-center text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Manage
                                                    </Link>
                                                    <button 
                                                        onClick={() => startEditing(match)}
                                                        className="p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PUBLISH WIDGET */}
                    {draftSchedule.length > 0 && (
                        <div className="border border-green-500/30 bg-green-500/5 rounded-sm p-6 text-center mt-8 relative overflow-hidden">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
                            <h3 className="font-heading text-xl italic uppercase text-green-400 font-bold mb-2">Ready to Publish</h3>
                            <p className="text-gray-400 text-sm max-w-lg mx-auto mb-6">
                                Once you lock in this schedule, these {draftSchedule.length} matches will be written instantly to the database and become visible to players.
                            </p>
                            <button
                                onClick={handlePublishSchedule}
                                disabled={isPublishing}
                                className="px-12 py-4 bg-green-500 hover:bg-green-400 text-black font-black uppercase tracking-widest text-lg rounded transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] disabled:opacity-50"
                            >
                                {isPublishing ? 'Publishing...' : 'Lock In & Publish Schedule'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
