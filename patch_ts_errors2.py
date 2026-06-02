import re

files = [
    'src/components/admin/TournamentForm.tsx',
    'src/components/admin/LeagueForm.tsx',
    'src/components/admin/RollingLeagueForm.tsx'
]

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Remove the bad line
    content = content.replace('// @ts-expect-error - Requires complex schema extension    const [requiresOfficials', '    const [requiresOfficials')
        
    with open(file, 'w') as f:
        f.write(content)

print("Fixed TS errors.")
