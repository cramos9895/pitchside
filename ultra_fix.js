const fs = require('fs');

function replaceAll(filePath, search, replacement) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.split(search).join(replacement);
    fs.writeFileSync(filePath, content);
}
function regexReplace(filePath, regex, replacement) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content);
}

const files = [
    'src/components/public/CaptainDashboard.tsx',
    'src/components/public/RollingCommandCenterView.tsx'
];

for (const file of files) {
    // Duplicate Match Fix
    replaceAll(file, 'import { Booking, Profile, Match, Team } from "@/types/index";', 'import { Booking, Profile } from "@/types/index";');
    replaceAll(file, 'import { Booking, Profile } from "@/types/index";', 'import { Booking, Profile } from "@/types/index";'); // Just to be sure it's clean
    
    // Set<unknown>
    replaceAll(file, 'new Set<unknown>()', 'new Set<string>()');
    
    // payload.new
    replaceAll(file, '...(payload.new as Record<string, unknown>),', '...(payload.new as any),');
    
    // message filter Match -> Message
    replaceAll(file, '.filter((m: Match) => m.id !== newMsg.id)', '.filter((m: Message) => m.id !== newMsg.id)');
    
    // RollingLifecycleGame casting
    replaceAll(file, 'calculateNextMatch(tournament as unknown)', 'calculateNextMatch(tournament as any)');
    replaceAll(file, 'calculateProjectedMatches(tournament as unknown)', 'calculateProjectedMatches(tournament as any)');
    
    // setActiveTab as unknown
    regexReplace(file, /setActiveTab\(tabId as unknown\)/g, 'setActiveTab(tabId as any)');
    
    // teams_config?: unknown[] -> any[]
    replaceAll(file, 'teams_config?: unknown[]', 'teams_config?: any[]');
    replaceAll(file, 'const initialTab = searchParams.get(\'tab\') as unknown || \'dashboard\';', 'const initialTab = searchParams.get(\'tab\') || \'dashboard\';');
    replaceAll(file, 'const initialTab = (searchParams.get(\'tab\') as unknown) || \'dashboard\';', 'const initialTab = searchParams.get(\'tab\') || \'dashboard\';');
}

// JoinGameModal.tsx fixes: tournament as any, and first_name issues.
replaceAll('src/components/JoinGameModal.tsx', '(p: Profile) => JSX.Element', '(p: any) => JSX.Element');
replaceAll('src/components/JoinGameModal.tsx', 'userProfile: any', 'userProfile: any');
replaceAll('src/components/JoinGameModal.tsx', 'tournament: any', 'tournament: any');

// StripeCheckoutModal.tsx
replaceAll('src/components/public/StripeCheckoutModal.tsx', 'await supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) =>', 'await supabase.auth.getUser().then(({ data: { user } }: any) =>');
replaceAll('src/components/public/StripeCheckoutModal.tsx', 'await supabase.auth.getUser().then(({data: {user}}) =>', 'await supabase.auth.getUser().then(({data: {user}}: any) =>');

// PickupCard.tsx
replaceAll('src/components/public/pickup/PickupCard.tsx', 'userProfile: unknown', 'userProfile: any');

