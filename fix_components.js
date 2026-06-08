const fs = require('fs');
const files = [
    'src/components/admin/LeagueForm.tsx',
    'src/components/admin/PickupForm.tsx',
    'src/components/admin/RollingLeagueForm.tsx',
    'src/components/admin/TournamentForm.tsx'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Find the injected block
    const match = content.match(/    \/\/ Templates State[\s\S]*?setIsSavingTemplate\(false\);\n        \}\n    \};\n/);
    if (match) {
        const block = match[0];
        
        // Remove the block from its current place
        content = content.replace(block, "");
        
        // Find the return statement
        const returnMatch = content.match(/    return \([\s\S]*?<form/);
        if (returnMatch) {
            const returnIndex = content.indexOf(returnMatch[0]);
            content = content.slice(0, returnIndex) + block + "\n" + content.slice(returnIndex);
            fs.writeFileSync(file, content);
            console.log(`Fixed ${file}`);
        } else {
            console.log(`Could not find return in ${file}`);
        }
    } else {
        console.log(`Could not find block in ${file}`);
    }
}
