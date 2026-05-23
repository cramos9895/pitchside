const fs = require('fs');
const content = fs.readFileSync('src/components/admin/MatchManager.tsx', 'utf8');

const regex = /await supabase\.from\('games'\)\.update\(payload\)\.eq\('id', gameId\);/g;

const replacement = `console.log("updateTimerDB firing with payload:", payload);
            const { data, error } = await supabase.from('games').update(payload).eq('id', gameId).select();
            if (error) throw error;
            console.log("DB update success, local UI updating next...", data);`;

if (regex.test(content)) {
    const newContent = content.replace(regex, replacement);
    fs.writeFileSync('src/components/admin/MatchManager.tsx', newContent);
    console.log("Success");
} else {
    console.log("Not found");
}
