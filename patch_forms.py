import re

files = [
    'src/components/admin/TournamentForm.tsx',
    'src/components/admin/LeagueForm.tsx',
    'src/components/admin/RollingLeagueForm.tsx'
]

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Add state
    if 'const [requiresOfficials, setRequiresOfficials]' not in content:
        # Insert after rulesDescription or title
        content = re.sub(
            r"(const \[title, setTitle\].*?\n)",
            r"\1    const [requiresOfficials, setRequiresOfficials] = useState(initialData?.requires_officials || false);\n",
            content,
            count=1
        )
    
    # Add to payload
    if 'requires_officials: requiresOfficials' not in content:
        # Insert into payload
        content = re.sub(
            r"(const payload = \{\n.*?)(rules_description: rulesDescription,)",
            r"\1requires_officials: requiresOfficials, \2",
            content,
            count=1
        )

    # Add UI Toggle
    if 'Requires Pitchside Officials?' not in content:
        # find the end of the first section (Match Info) and add a toggle
        toggle_ui = """
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-sm">
                    <input 
                        type="checkbox" 
                        id="requires_officials"
                        checked={requiresOfficials}
                        onChange={(e) => setRequiresOfficials(e.target.checked)}
                        className="w-5 h-5 accent-[#cbff00] cursor-pointer"
                    />
                    <label htmlFor="requires_officials" className="text-white font-bold tracking-wide cursor-pointer select-none">
                        Requires Pitchside Officials?
                    </label>
                </div>
"""
        # Insert before Surface Type grid
        content = re.sub(
            r"(<div className=\"grid grid-cols-1 md:grid-cols-3 gap-6\">)",
            toggle_ui + r"\n                \1",
            content,
            count=1
        )
        
    with open(file, 'w') as f:
        f.write(content)

print("Patched all forms.")
