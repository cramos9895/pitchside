const fs = require('fs');
let content = fs.readFileSync('src/app/admin/(dashboard)/games/[id]/page.tsx', 'utf8');

// Add localStorage syncing
content = content.replace(
    "const [activeTab, setActiveTab] = useState('player-manager');",
    `const [activeTab, setActiveTab] = useState('player-manager');

    // Sync tab state with localStorage to survive hard refreshes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(\`adminTab-\${gameId}\`);
            if (saved) setActiveTab(saved);
        }
    }, [gameId]);

    const handleTabChange = (val: string) => {
        setActiveTab(val);
        if (typeof window !== 'undefined') {
            localStorage.setItem(\`adminTab-\${gameId}\`, val);
        }
    };`
);

content = content.replace(
    "<Tabs value={activeTab} onValueChange={setActiveTab} className=\"w-full\">",
    "<Tabs value={activeTab} onValueChange={handleTabChange} className=\"w-full\">"
);

fs.writeFileSync('src/app/admin/(dashboard)/games/[id]/page.tsx', content);
console.log("Success");
