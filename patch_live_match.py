import re

with open('src/app/referee/matches/[id]/LiveMatchClient.tsx', 'r') as f:
    content = f.read()

# 1. Add state for modal and jerseys
modal_state = """
    const [activeEventModal, setActiveEventModal] = useState<{ teamSide: 'home' | 'away', teamId: string | null, eventType: string } | null>(null);
    const [activeJerseys, setActiveJerseys] = useState<string[]>([]);
    
    const fetchJerseysForTeam = async (teamId: string | null) => {
        if (!teamId) return [];
        // Try team_players first
        const { data: tpData } = await supabase.from('team_players').select('jersey_number').eq('team_id', teamId).not('jersey_number', 'is', null);
        let jerseys = (tpData || []).map(p => p.jersey_number).filter(Boolean);
        if (jerseys.length === 0) {
            // Try tournament_registrations
            const { data: trData } = await supabase.from('tournament_registrations').select('jersey_number').eq('team_id', teamId).not('jersey_number', 'is', null);
            jerseys = (trData || []).map(p => p.jersey_number).filter(Boolean);
        }
        return Array.from(new Set(jerseys)) as string[];
    };

    const triggerEventModal = async (teamSide: 'home' | 'away', teamId: string | null, eventType: string) => {
        setIsProcessing(true);
        const jerseys = await fetchJerseysForTeam(teamId);
        setActiveJerseys(jerseys);
        setActiveEventModal({ teamSide, teamId, eventType });
        setIsProcessing(false);
    };
"""

content = content.replace("    const [isProcessing, setIsProcessing] = useState(false);", "    const [isProcessing, setIsProcessing] = useState(false);" + modal_state)

# 2. Modify handleFinalizeMatch to route to report
finalize_replacement = """
    const handleFinalizeMatch = async () => {
        if (!confirm('Are you sure you want to finalize this match? The score will be locked.')) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('matches')
                .update({ status: 'finalized', is_final: true, review_status: 'pending_report' })
                .eq('id', match.id);
            if (error) throw error;
            setMatch({ ...match, status: 'finalized', is_final: true });
            router.push(`/referee/matches/${match.id}/report`);
        } catch (e) {
            console.error('Failed to finalize match', e);
            alert('Failed to finalize match');
        } finally {
            setIsProcessing(false);
        }
    };
"""

content = re.sub(r"    const handleFinalizeMatch = async \(\) => \{.*?\n    \};\n", finalize_replacement, content, flags=re.DOTALL)

# 3. Modify logEvent to take jersey_number
log_replacement = """
    const logEvent = async (teamType: 'home' | 'away', teamId: string | null, eventType: string, jerseyNumber: string | null = null) => {
        if (!isInProgress) {
            alert('Match must be in progress to log events.');
            return;
        }

        setIsProcessing(true);
        try {
            const currentMinute = 1; // Temporary mock, can build timer later
            const { error } = await supabase
                .from('match_events')
                .insert([{
                    match_id: match.id,
                    team_id: teamId,
                    event_type: eventType,
                    minute_mark: currentMinute,
                    jersey_number: jerseyNumber
                }]);
"""

content = re.sub(r"    const logEvent = async \(teamType: 'home' \| 'away', teamId: string \| null, eventType: string\) => \{.*?\n                \}\]\);", log_replacement, content, flags=re.DOTALL)

# 4. Modify button clicks to use triggerEventModal instead of logEvent
content = content.replace("onClick={() => logEvent('home', match.home_team_id, 'goal')}", "onClick={() => triggerEventModal('home', match.home_team_id, 'goal')}")
content = content.replace("onClick={() => logEvent('home', match.home_team_id, 'yellow_card')}", "onClick={() => triggerEventModal('home', match.home_team_id, 'yellow_card')}")
content = content.replace("onClick={() => logEvent('home', match.home_team_id, 'red_card')}", "onClick={() => triggerEventModal('home', match.home_team_id, 'red_card')}")

content = content.replace("onClick={() => logEvent('away', match.away_team_id, 'goal')}", "onClick={() => triggerEventModal('away', match.away_team_id, 'goal')}")
content = content.replace("onClick={() => logEvent('away', match.away_team_id, 'yellow_card')}", "onClick={() => triggerEventModal('away', match.away_team_id, 'yellow_card')}")
content = content.replace("onClick={() => logEvent('away', match.away_team_id, 'red_card')}", "onClick={() => triggerEventModal('away', match.away_team_id, 'red_card')}")

# 5. Add Modal UI at the end
modal_ui = """
                {/* Event Modal */}
                {activeEventModal && (
                    <div className="fixed inset-0 z-50 bg-pitch-black flex flex-col">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-3xl font-black italic uppercase tracking-widest text-white">
                                {activeEventModal.eventType.replace('_', ' ')}
                            </h2>
                            <button onClick={() => setActiveEventModal(null)} className="text-gray-500 hover:text-white">
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            <button
                                onClick={() => {
                                    logEvent(activeEventModal.teamSide, activeEventModal.teamId, activeEventModal.eventType, null);
                                    setActiveEventModal(null);
                                }}
                                className="w-full py-6 bg-white/5 border-2 border-white/10 rounded-sm text-white font-black uppercase tracking-widest text-xl hover:bg-white/10 transition-colors"
                            >
                                Unknown / No Selection
                            </button>

                            <div className="grid grid-cols-3 gap-4">
                                {activeJerseys.length > 0 ? activeJerseys.map(jersey => (
                                    <button
                                        key={jersey}
                                        onClick={() => {
                                            logEvent(activeEventModal.teamSide, activeEventModal.teamId, activeEventModal.eventType, jersey);
                                            setActiveEventModal(null);
                                        }}
                                        className="aspect-square bg-pitch-card border-2 border-[#cbff00]/50 hover:bg-[#cbff00]/20 rounded-sm flex items-center justify-center text-4xl font-black italic text-[#cbff00] transition-colors"
                                    >
                                        {jersey}
                                    </button>
                                )) : (
                                    <div className="col-span-3 text-center text-gray-500 font-bold uppercase mt-8">
                                        No active jerseys found. Use the Unknown bypass.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
"""
content = content.replace("            </main>\n        </div>\n    );\n}", modal_ui + "\n            </main>\n        </div>\n    );\n}")

with open('src/app/referee/matches/[id]/LiveMatchClient.tsx', 'w') as f:
    f.write(content)

print("Patched LiveMatchClient.tsx")
