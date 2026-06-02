import re

with open('src/components/public/CaptainDashboard.tsx', 'r') as f:
    content = f.read()

# 1. Add handleUpdateJersey
jersey_fn = """
    const handleUpdateJersey = async (id: string, value: string) => {
        try {
            await supabase.from('tournament_registrations').update({ jersey_number: value }).eq('id', id);
        } catch (err) {
            console.error('Failed to update jersey', err);
        }
    };
"""

content = content.replace("    const handlePaySelection = () => {", jersey_fn + "\n    const handlePaySelection = () => {")

# 2. Add UI for jersey number
ui_replacement = """
                                                <div>
                                                    <div className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                                        {player.profiles.first_name} {player.profiles.last_name || 'Unknown Player'}
                                                        <input
                                                            type="text"
                                                            placeholder="#"
                                                            defaultValue={player.jersey_number || ''}
                                                            onBlur={(e) => handleUpdateJersey(player.id, e.target.value)}
                                                            className="w-12 h-6 bg-white/10 border border-white/20 rounded px-1 text-xs text-center font-black uppercase placeholder:text-gray-600 focus:outline-none focus:border-[#ccff00] transition-colors"
                                                            maxLength={3}
                                                        />
"""

content = content.replace("""
                                                <div>
                                                    <div className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                                        {player.profiles.first_name} {player.profiles.last_name || 'Unknown Player'}
""", ui_replacement)

with open('src/components/public/CaptainDashboard.tsx', 'w') as f:
    f.write(content)

print("Patched CaptainDashboard.")
