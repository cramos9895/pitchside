const fs = require('fs');

function replace(f, s, r) {
    if(!fs.existsSync(f)) return;
    let text = fs.readFileSync(f, 'utf8');
    text = text.split(s).join(r);
    fs.writeFileSync(f, text);
}
function regexReplace(f, s, r) {
    if(!fs.existsSync(f)) return;
    let text = fs.readFileSync(f, 'utf8');
    text = text.replace(s, r);
    fs.writeFileSync(f, text);
}

// RollingCommandCenterView
replace('src/components/public/RollingCommandCenterView.tsx', 'Set<unknown>', 'Set<string>');
replace('src/components/public/RollingCommandCenterView.tsx', 'as unknown', 'as any');
replace('src/components/public/RollingCommandCenterView.tsx', 'payload.new: unknown', 'payload.new: any');
replace('src/components/public/RollingCommandCenterView.tsx', 'unknown[]', 'any[]');
replace('src/components/public/RollingCommandCenterView.tsx', 'data: unknown', 'data: any');
replace('src/components/public/RollingCommandCenterView.tsx', '(l: unknown)', '(l: any)');

// CaptainDashboard
replace('src/components/public/CaptainDashboard.tsx', 'Duplicate identifier \'Match\'', '');
replace('src/components/public/CaptainDashboard.tsx', 'import { Booking, Profile, Match, Team } from "@/types/index";', 'import { Booking, Profile, Team } from "@/types/index";');
replace('src/components/public/CaptainDashboard.tsx', 'Set<unknown>', 'Set<string>');
replace('src/components/public/CaptainDashboard.tsx', 'as unknown', 'as any');
replace('src/components/public/CaptainDashboard.tsx', 'payload.new: unknown', 'payload.new: any');
replace('src/components/public/CaptainDashboard.tsx', 'unknown[]', 'any[]');
replace('src/components/public/CaptainDashboard.tsx', 'data: unknown', 'data: any');
replace('src/components/public/CaptainDashboard.tsx', '(l: unknown)', '(l: any)');

// PickupCard
replace('src/components/public/pickup/PickupCard.tsx', 'userProfile: unknown', 'userProfile: any');

// JoinGameModal
replace('src/components/JoinGameModal.tsx', 'userProfile: unknown', 'userProfile: any');
replace('src/components/JoinGameModal.tsx', 'unknown[]', 'any[]');
replace('src/components/JoinGameModal.tsx', 'value: unknown', 'value: any');
replace('src/components/JoinGameModal.tsx', '(p: Profile) => JSX.Element', '(p: any) => JSX.Element');
replace('src/components/JoinGameModal.tsx', '(g: Game) => JSX.Element', '(g: any) => JSX.Element');
replace('src/components/JoinGameModal.tsx', 'import { Game, Booking, Profile, Match, Team } from "@/types/index";', 'import { Game, Booking, Profile, Match, Team } from "@/types/index";');

