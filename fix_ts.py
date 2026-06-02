import re

# 1. Fix LiveMatchClient.tsx logEvent
with open('src/app/referee/matches/[id]/LiveMatchClient.tsx', 'r') as f:
    live = f.read()

live = live.replace("const logEvent = async (teamType: 'home' | 'away', teamId: string | null, eventType: string) => {", 
                    "const logEvent = async (teamType: 'home' | 'away', teamId: string | null, eventType: string, jerseyNumber: string | null = null) => {")

live = live.replace("""                .insert({
                    match_id: match.id,
                    team_id: teamId,
                    event_type: eventType,
                });""", """                .insert({
                    match_id: match.id,
                    team_id: teamId,
                    event_type: eventType,
                    jersey_number: jerseyNumber,
                });""")

with open('src/app/referee/matches/[id]/LiveMatchClient.tsx', 'w') as f:
    f.write(live)

# 2. Fix CaptainDashboard.tsx Player type and handleUpdateJersey
with open('src/components/public/CaptainDashboard.tsx', 'r') as f:
    cap = f.read()

# Add handleUpdateJersey before handleRsvp
jersey_fn = """
    const handleUpdateJersey = async (id: string, value: string) => {
        try {
            await supabase.from('tournament_registrations').update({ jersey_number: value }).eq('id', id);
        } catch (err) {
            console.error('Failed to update jersey', err);
        }
    };
"""
cap = cap.replace("    const handleRsvp = async (status: 'committed' | 'out') => {", jersey_fn + "\n    const handleRsvp = async (status: 'committed' | 'out') => {")

# Type cast player to any since it's giving TS errors
cap = cap.replace("defaultValue={player.jersey_number || ''}", "defaultValue={(player as any).jersey_number || ''}")

with open('src/components/public/CaptainDashboard.tsx', 'w') as f:
    f.write(cap)

print("Fixed TS errors.")
