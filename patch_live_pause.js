const fs = require('fs');
let content = fs.readFileSync('src/app/games/[id]/live/page.tsx', 'utf8');

// Patch calculateInitialTime
content = content.replace(
    "if (g?.timer_status === 'stopped' || g?.timer_status === 'paused') {",
    "if (g?.timer_status === 'stopped') {\n            setTimeRemaining(standardDuration);\n        } else if (g?.timer_status === 'paused') {\n            setTimeRemaining(g?.timer_duration || standardDuration);\n        } else if (g?.timer_status === 'foo') {" // The 'foo' branch is just a dummy to avoid breaking the original else if flow, but let's do it cleaner.
);

// Better way: use regex replacement for calculateInitialTime
content = content.replace(
    /if\s*\(g\?\.timer_status\s*===\s*'stopped'\s*\|\|\s*g\?\.timer_status\s*===\s*'paused'\)\s*\{\s*setTimeRemaining\(standardDuration\);\s*\}/,
    `if (g?.timer_status === 'stopped') {
            setTimeRemaining(standardDuration);
        } else if (g?.timer_status === 'paused') {
            setTimeRemaining(g?.timer_duration || standardDuration);
        }`
);

// Patch setInterval
content = content.replace(
    /} else {\n\s*\/\/ Stopped\/Paused: Force Sync to Half Length if available\n\s*const hLen = g\.half_length \|\| 0;\n\s*const standard = hLen > 0 \? \(hLen \* 60\) : \(g\.timer_duration \|\| 0\);\n\s*setTimeRemaining\(standard\);\n\s*}/,
    `} else if (g.timer_status === 'paused') {
                setTimeRemaining(g.timer_duration || 0);
            } else {
                // Stopped: Force Sync to Half Length if available
                const hLen = g.half_length || 0;
                const standard = hLen > 0 ? (hLen * 60) : (g.timer_duration || 0);
                setTimeRemaining(standard);
            }`
);

fs.writeFileSync('src/app/games/[id]/live/page.tsx', content);
console.log("Success");
