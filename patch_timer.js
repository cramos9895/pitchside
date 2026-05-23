const fs = require('fs');
const content = fs.readFileSync('src/components/admin/MatchManager.tsx', 'utf8');

const regex = /<\s*button\s+onClick=\{\s*async\s*\(\)\s*=>\s*\{\s*setTimerLoading\(true\);\s*const\s*explicitStartTime[^]*?\}\}\s*disabled=\{timerLoading\}\s*className="px-6 py-2 bg-pitch-accent text-black font-bold uppercase rounded flex items-center gap-2 hover:bg-white transition-colors"\s*>\s*<\s*PlayCircle\s*className="w-4 h-4"\s*\/>\s*Start\s*<\/\s*button\s*>/g;

const replacement = `<button
                                onClick={() => updateTimerDB('running')}
                                disabled={timerLoading}
                                className="px-6 py-2 bg-pitch-accent text-black font-bold uppercase rounded flex items-center gap-2 hover:bg-white transition-colors"
                            >
                                <PlayCircle className="w-4 h-4" /> Start
                            </button>`;

if (regex.test(content)) {
    const newContent = content.replace(regex, replacement);
    fs.writeFileSync('src/components/admin/MatchManager.tsx', newContent);
    console.log("Success");
} else {
    console.log("Not found");
}
