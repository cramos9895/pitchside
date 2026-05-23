const fs = require('fs');

function replaceFile(path, replacements) {
    if (!fs.existsSync(path)) return;
    let text = fs.readFileSync(path, 'utf8');
    for (const [search, replace] of replacements) {
        text = text.replace(search, replace);
    }
    fs.writeFileSync(path, text);
}

// 1. JoinGameModal
replaceFile('src/components/JoinGameModal.tsx', [
    ['import { Booking, Profile, Match, Team } from "@/types/index";', 'import { Booking, Profile, Match, Team, GameWithPayments, ProfileWithUI } from "@/types/index";'],
    ['const tournament: any = {}', ''],
    ['tournament: any', 'tournament: GameWithPayments'],
    ['const { tournament } = data as any;', 'const { tournament } = data as { tournament: GameWithPayments };'],
    ['const { tournament, player } = data as any;', 'const { tournament, player } = data as { tournament: GameWithPayments, player: ProfileWithUI };'],
    ['({ data }: { data: any }) =>', '({ data }: { data: { tournament: GameWithPayments, player: ProfileWithUI } }) =>'],
    ['(sg: ExtendedGame, p: ExtendedProfile)', '(sg: GameWithPayments, p: ProfileWithUI)'],
    ['const u = userProfile as ExtendedProfile;', 'const u = userProfile as ProfileWithUI;'],
    ['userProfile: ExtendedProfile', 'userProfile: ProfileWithUI'],
    ['<{ data: ExtendedProfile, error: any }>', '<{ data: ProfileWithUI, error: any }>'],
    ['const profile = await supabase.from(\'profiles\').select(\'*\').eq(\'id\', u.id).single() as { data: ExtendedProfile, error: any };', 'const profile = await supabase.from(\'profiles\').select(\'*\').eq(\'id\', u.id).single() as { data: ProfileWithUI, error: any };'],
    ['(p: any)', '(p: ProfileWithUI)']
]);

// 2. CaptainDashboard
replaceFile('src/components/public/CaptainDashboard.tsx', [
    ['import { Booking, Profile, Team, Match } from "@/types/index";', 'import { Booking, Profile, Team, Match, MatchWithTeams } from "@/types/index";'],
    ['matches: Match[];', 'matches: MatchWithTeams[];'],
    ['myMatches.map((match: Match, idx)', 'myMatches.map((match: MatchWithTeams, idx)'],
    ['(m: Match)', '(m: MatchWithTeams)'],
    ['const myMatches = matches.filter((m: MatchWithTeams) =>', 'const myMatches = matches.filter((m: MatchWithTeams) => m.home_team_id === team.id || m.away_team_id === team.id); //'],
    ['payload.new as Record<string, unknown>', 'payload.new as Message'],
    ['(m as any).home_team_obj', 'm.home_team_obj'],
    ['(m as any).away_team_obj', 'm.away_team_obj']
]);

// 3. PickupCard
replaceFile('src/components/public/pickup/PickupCard.tsx', [
    ['import { Booking, Profile } from "@/types/index";', 'import { Booking, Profile, ProfileWithUI } from "@/types/index";'],
    ['interface ExtendedProfile extends Profile { free_game_credits?: number; }', ''],
    ['userProfile: ExtendedProfile', 'userProfile: ProfileWithUI'],
    ['userProfile as ProfileWithUI', 'userProfile as ProfileWithUI'],
    ['user as unknown as ExtendedProfile', 'user as unknown as ProfileWithUI']
]);

// 4. OperationsCheckIn
replaceFile('src/components/facility/operations/OperationsCheckIn.tsx', [
    ['import { Booking, Profile } from \'@/types/index\';', 'import { Booking, Profile, OperationsCheckInGame } from \'@/types/index\';'],
    ['const game: any = {}', ''],
    ['tournament: any', 'tournament: OperationsCheckInGame'],
    ['const { game } = data as any;', 'const { game } = data as { game: OperationsCheckInGame };'],
    ['booking: any', 'booking: Booking'],
    ['player: any', 'player: ProfileWithUI'],
    ['(w: unknown)', '(w: any)']
]);

// 5. MatchManager & PickupForm
replaceFile('src/components/admin/MatchManager.tsx', [
    ['(t: any) =>', '(t: TeamConfig) =>'],
    ['(p: any) =>', '(p: { id: string; name: string; team: string; }) =>'],
    ['(m: any) =>', '(m: string) =>'],
    ['teams.map((t: TeamConfig)', 'teams.map((t: TeamConfig)']
]);

replaceFile('src/components/admin/PickupForm.tsx', [
    ['(m: any) =>', '(m: string) =>'],
    ['(team: any, index: number) =>', '(team: TeamConfig, index: number) =>']
]);

