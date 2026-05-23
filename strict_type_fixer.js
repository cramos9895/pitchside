const fs = require('fs');

function fixJoinGameModal() {
    let text = fs.readFileSync('src/components/JoinGameModal.tsx', 'utf8');
    
    // Add extended types
    if (!text.includes('interface ExtendedGame')) {
        text = text.replace(
            'import { Game, Booking, Profile, Match, Team } from "@/types/index";',
            'import { Game, Booking, Profile, Match, Team } from "@/types/index";\n\ninterface ExtendedGame extends Game { payment_collection_type?: string; player_registration_fee?: number; cash_fee_structure?: string; cash_amount?: number; strict_waiver_required?: boolean; waiver_details?: string; }'
        );
    }
    
    text = text.replace(/tournament: any/g, 'tournament: ExtendedGame');
    text = text.replace(/const { tournament } = data as any;/g, 'const { tournament } = data as { tournament: ExtendedGame };');
    text = text.replace(/const { tournament, player } = data as any;/g, 'const { tournament, player } = data as { tournament: ExtendedGame, player: Profile };');
    text = text.replace(/userProfile: any/g, 'userProfile: Profile');
    text = text.replace(/const u: any = userProfile;/g, 'const u = userProfile as Profile;');
    
    // first_name, last_name fixes on Profile (wait, Profile doesn't have first_name!)
    // Let's add them to an ExtendedProfile
    if (!text.includes('interface ExtendedProfile')) {
        text = text.replace(
            'interface ExtendedGame',
            'interface ExtendedProfile extends Profile { first_name?: string; last_name?: string; }\ninterface ExtendedGame'
        );
    }
    text = text.replace(/userProfile: Profile/g, 'userProfile: ExtendedProfile');
    text = text.replace(/const u = userProfile as Profile;/g, 'const u = userProfile as ExtendedProfile;');
    text = text.replace(/const profile = await supabase.from\('profiles'\).select\('\*'\).eq\('id', u\.id\).single\(\);/g, 'const profile = await supabase.from(\'profiles\').select(\'*\').eq(\'id\', u.id).single() as { data: ExtendedProfile, error: any };');
    text = text.replace(/const profile: any =/g, 'const profile =');
    
    text = text.replace(/\({ data }\) =>/g, '({ data }: { data: any }) =>');
    text = text.replace(/\(sg: any, p: any\)/g, '(sg: ExtendedGame, p: ExtendedProfile)');
    
    fs.writeFileSync('src/components/JoinGameModal.tsx', text);
}

function fixPickupCard() {
    let text = fs.readFileSync('src/components/public/pickup/PickupCard.tsx', 'utf8');
    
    if (!text.includes('interface ExtendedProfile')) {
        text = text.replace(
            'import { Booking, Profile } from "@/types/index";',
            'import { Booking, Profile } from "@/types/index";\n\ninterface ExtendedProfile extends Profile { free_game_credits?: number; }'
        );
    }
    text = text.replace(/userProfile: any/g, 'userProfile: ExtendedProfile');
    text = text.replace(/const { data: { user: userProfile } }: { data: { user: any } } =/g, 'const { data: { user } } = await supabase.auth.getUser();\nconst userProfile = user as unknown as ExtendedProfile;\n//');
    
    fs.writeFileSync('src/components/public/pickup/PickupCard.tsx', text);
}

function fixCaptainDashboard() {
    let text = fs.readFileSync('src/components/public/CaptainDashboard.tsx', 'utf8');
    text = text.replace(/Duplicate identifier 'Match'/g, ''); // just in case
    text = text.replace(/import { StandingsTable, Match } from/g, 'import { StandingsTable } from'); // Remove Match
    // We already have `Match` imported from types? Let's check imports
    text = text.replace(/import { Booking, Profile, Team } from/g, 'import { Booking, Profile, Team, Match } from');
    text = text.replace(/new Set<string>\(\)/g, 'new Set<string>()');
    // payload.new casting
    text = text.replace(/payload.new as any/g, 'payload.new as Record<string, unknown>');
    fs.writeFileSync('src/components/public/CaptainDashboard.tsx', text);
}

function fixRollingCommandCenterView() {
    let text = fs.readFileSync('src/components/public/RollingCommandCenterView.tsx', 'utf8');
    text = text.replace(/payload.new as any/g, 'payload.new as Record<string, unknown>');
    fs.writeFileSync('src/components/public/RollingCommandCenterView.tsx', text);
}

fixJoinGameModal();
fixPickupCard();
fixCaptainDashboard();
fixRollingCommandCenterView();
