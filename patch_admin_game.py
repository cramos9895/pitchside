import re

with open('src/app/admin/(dashboard)/games/[id]/page.tsx', 'r') as f:
    content = f.read()

# We need a client-side method to update jersey number. Since this is a massive server+client hybrid,
# let's look if there is a supabase instance already or if we can inject a quick update.
# The component is a large client component (uses `const supabase = createClient();` at the top).

jersey_fn = """
    const handleUpdateJerseyAdmin = async (id: string, value: string) => {
        try {
            await supabase.from('bookings').update({ jersey_number: value }).eq('id', id);
        } catch (err) {
            console.error('Failed to update jersey', err);
        }
    };
"""

content = content.replace("    const handleMatchUpdate = () => {", jersey_fn + "\n    const handleMatchUpdate = () => {")

ui_replacement = """
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-bold truncate text-sm flex items-center gap-2">
                                                                    {displayName}
                                                                    <input
                                                                        type="text"
                                                                        placeholder="#"
                                                                        defaultValue={booking.jersey_number || ''}
                                                                        onBlur={(e) => handleUpdateJerseyAdmin(booking.id, e.target.value)}
                                                                        className="w-12 h-6 bg-white/10 border border-white/20 rounded px-1 text-xs text-center font-black uppercase placeholder:text-gray-600 focus:outline-none focus:border-[#ccff00] transition-colors"
                                                                        maxLength={3}
                                                                    />
                                                                </div>
"""

content = content.replace("""
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-bold truncate text-sm">{displayName}</div>
""", ui_replacement)

with open('src/app/admin/(dashboard)/games/[id]/page.tsx', 'w') as f:
    f.write(content)

print("Patched Admin Game UI.")
