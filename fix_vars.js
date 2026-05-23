const fs = require('fs');
let content = fs.readFileSync('src/components/admin/MatchManager.tsx', 'utf8');

// Remove localHalfLength from line 114
content = content.replace(
    "    const [localHalfLength, setLocalHalfLength] = useState<number | null>(game.half_length || null);\n",
    ""
);

// Insert it right before standardDuration
content = content.replace(
    "    // Standard Duration Calculation",
    "    const [localHalfLength, setLocalHalfLength] = useState<number | null>(game.half_length || null);\n    // Standard Duration Calculation"
);

fs.writeFileSync('src/components/admin/MatchManager.tsx', content);
console.log("Success");
