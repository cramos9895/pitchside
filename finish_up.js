const fs = require('fs');

function replace(f, s, r) {
    if(!fs.existsSync(f)) return;
    let text = fs.readFileSync(f, 'utf8');
    text = text.split(s).join(r);
    fs.writeFileSync(f, text);
}

// 1. JoinGameModal
replace('src/components/JoinGameModal.tsx', 'tournament: any', 'tournament: any'); // Leave as any or unknown, wait, it complained: `Property 'payment_collection_type' does not exist on type '{}'`
// This means it was still typed as {}. Let me force it to `any`
replace('src/components/JoinGameModal.tsx', 'const { tournament } = data;', 'const { tournament } = data as any;');
replace('src/components/JoinGameModal.tsx', 'const { tournament, player } = data;', 'const { tournament, player } = data as any;');
// Fix Game / Booking missing imports
replace('src/components/JoinGameModal.tsx', 'import { Profile } from "@/types/index";', 'import { Profile, Game, Booking, Team } from "@/types/index";');
replace('src/components/JoinGameModal.tsx', 'import { Booking, Profile } from "@/types/index";', 'import { Profile, Game, Booking, Team } from "@/types/index";');

// 2. CaptainDashboard & RollingCommandCenterView
const rccvs = ['src/components/public/CaptainDashboard.tsx', 'src/components/public/RollingCommandCenterView.tsx'];
for (const f of rccvs) {
    replace(f, 'import { Booking, Profile, Match, Team }', 'import { Booking, Profile, Team }'); // Remove duplicate Match
    replace(f, 'import { Booking, Profile, Team }', 'import { Booking, Profile, Team }');
    replace(f, 'import { StandingsTable, Match } from "@/components/admin/StandingsTable";', 'import { StandingsTable, Match } from "@/components/admin/StandingsTable";');
    replace(f, 'Set<unknown>', 'Set<string>');
    replace(f, 'payload.new: unknown', 'payload.new: any');
    replace(f, 'as unknown)', 'as any)'); // `(searchParams.get('tab') as any)`
    replace(f, 'teams_config?: unknown[]', 'teams_config?: any[]');
    replace(f, '(l: unknown)', '(l: any)');
}

// 3. StripeCheckoutModal
replace('src/components/public/StripeCheckoutModal.tsx', '({data: {user}}: any)', '({data: {user}}: {data: {user: any}})');
replace('src/components/public/StripeCheckoutModal.tsx', '({ data: { user } }: any)', '({ data: { user } }: { data: { user: any } })');
// Wait, the error is `Binding element 'user' implicitly has an 'any' type`.
replace('src/components/public/StripeCheckoutModal.tsx', '({ data: { user } })', '({ data: { user } }: { data: { user: any } })');

// 4. PickupCard
replace('src/components/public/pickup/PickupCard.tsx', 'const { data: { user: userProfile } } =', 'const { data: { user: userProfile } }: { data: { user: any } } =');
replace('src/components/public/pickup/PickupCard.tsx', 'userProfile: unknown', 'userProfile: any');

