const fs = require('fs');
let content = fs.readFileSync('src/app/admin/(dashboard)/games/[id]/page.tsx', 'utf8');

// Replace header section to include Sort dropdown
content = content.replace(
    /<div className="flex items-center justify-between mb-2">\s*<h2 className="font-heading text-2xl font-bold italic uppercase flex items-center gap-2 mb-0">\s*<Users className="w-6 h-6 text-pitch-accent" \/> Active Roster\s*<\/h2>\s*<ManualAddPlayerModal gameId={gameId} basePrice={game\.price \|\| 0} onSuccess={\(\) => { fetchMatches\(\); router\.refresh\(\); handleMatchUpdate\(\); }} \/>\s*<\/div>/,
    `<div className="flex items-center justify-between mb-2 flex-wrap gap-4">
                                    <h2 className="font-heading text-2xl font-bold italic uppercase flex items-center gap-2 mb-0">
                                        <Users className="w-6 h-6 text-pitch-accent" /> Active Roster
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                                        <Select value={rosterSort} onValueChange={setRosterSort}>
                                            <SelectTrigger className="w-full md:w-[180px] h-10 border-white/10 bg-black/40">
                                                <SelectValue placeholder="Sort by..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
                                                <SelectItem value="reverse">Reverse (Z-A)</SelectItem>
                                                <SelectItem value="team">Team Assignment</SelectItem>
                                                <SelectItem value="payment">Payment Status</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <div className="w-full md:w-auto mt-2 md:mt-0">
                                            <ManualAddPlayerModal gameId={gameId} basePrice={game.price || 0} onSuccess={() => { fetchMatches(); router.refresh(); handleMatchUpdate(); }} />
                                        </div>
                                    </div>
                                </div>`
);

// Replace mapping logic to include sort
content = content.replace(
    /\{\s*roster\.map\(\(booking:\s*any\)\s*=>\s*\{/,
    `{ [...roster].sort((a, b) => {
                                            const pA = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
                                            const pB = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
                                            const nameA = (pA?.first_name ? \`\${pA.first_name} \${pA.last_name}\` : pA?.email || 'Z').toLowerCase();
                                            const nameB = (pB?.first_name ? \`\${pB.first_name} \${pB.last_name}\` : pB?.email || 'Z').toLowerCase();
                                            
                                            if (rosterSort === 'alphabetical') return nameA.localeCompare(nameB);
                                            if (rosterSort === 'reverse') return nameB.localeCompare(nameA);
                                            if (rosterSort === 'team') {
                                                const teamA = a.team_assignment || 'Z';
                                                const teamB = b.team_assignment || 'Z';
                                                if (teamA === teamB) return nameA.localeCompare(nameB);
                                                return teamA.localeCompare(teamB);
                                            }
                                            if (rosterSort === 'payment') {
                                                const valA = a.payment_status === 'verified' ? 3 : a.payment_status === 'pending' ? 2 : 1;
                                                const valB = b.payment_status === 'verified' ? 3 : b.payment_status === 'pending' ? 2 : 1;
                                                if (valA === valB) return nameA.localeCompare(nameB);
                                                return valB - valA;
                                            }
                                            return 0;
                                        }).map((booking: any) => {`
);

fs.writeFileSync('src/app/admin/(dashboard)/games/[id]/page.tsx', content);
console.log("Success");
