const fs = require('fs');
let content = fs.readFileSync('src/components/admin/MatchManager.tsx', 'utf8');

// Add localHalfLength state
content = content.replace(
    "const [lengthInput, setLengthInput] = useState((game.half_length || 7).toString());",
    `const [lengthInput, setLengthInput] = useState((game.half_length || 7).toString());\n    const [localHalfLength, setLocalHalfLength] = useState<number | null>(game.half_length || null);`
);

// Update standardDuration to use localHalfLength
content = content.replace(
    "const standardDuration = game.half_length ? game.half_length * 60 : 420;",
    "const standardDuration = localHalfLength ? localHalfLength * 60 : 420;"
);

// Update handleSaveGameLength to set localHalfLength
content = content.replace(
    "setTimeRemaining(newDurationSecs);\n            }",
    "setTimeRemaining(newDurationSecs);\n            }\n            setLocalHalfLength(newMins);"
);

// Update useEffect to sync localHalfLength when game prop changes
content = content.replace(
    "setLengthInput((game.half_length || 7).toString());",
    "setLengthInput((game.half_length || 7).toString());\n        setLocalHalfLength(game.half_length || null);"
);

// Fix the other useEffect that references game.half_length
content = content.replace(
    "const correctDuration = game.half_length ? game.half_length * 60 : 420;",
    "const correctDuration = localHalfLength ? localHalfLength * 60 : 420;"
);
content = content.replace(
    "}, [game.half_length, timerStatus]);",
    "}, [localHalfLength, timerStatus]);"
);

fs.writeFileSync('src/components/admin/MatchManager.tsx', content);
console.log("Success");
