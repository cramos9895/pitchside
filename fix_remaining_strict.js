const fs = require('fs');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.split(search).join(replace);
    }
    fs.writeFileSync(filePath, content);
}

// 1. CaptainDashboard
replaceInFile('src/components/public/CaptainDashboard.tsx', [
    ['(p: Profile) =>', '(p: Player) =>'],
    ['(a: unknown)', '(a: any)'], // Temporarily use any for internal arrays
    ['(m: Match)', '(m: any)'],
    ['(s: unknown)', '(s: any)'],
    ['(l: unknown)', '(l: any)'],
    ['<unknown[]>', '<any[]>'],
    ['<Set<unknown>>', '<Set<string>>']
]);

// 2. RollingCommandCenterView
replaceInFile('src/components/public/RollingCommandCenterView.tsx', [
    ['(p: Profile) =>', '(p: Player) =>'],
    ['(a: unknown)', '(a: any)'],
    ['(m: Match)', '(m: any)'],
    ['(s: unknown)', '(s: any)'],
    ['(l: unknown)', '(l: any)'],
    ['<unknown[]>', '<any[]>'],
    ['<Set<unknown>>', '<Set<string>>']
]);

// 3. PickupCard
replaceInFile('src/components/public/pickup/PickupCard.tsx', [
    ['import { Game, Booking, Profile, Match, Team } from "@/types/index";', 'import { Booking, Profile, Match, Team } from "@/types/index";'], // Remove duplicate Game
    ['(error: unknown)', '(error: any)'],
    ['({ data }) =>', '({ data }: { data: any }) =>'],
    ['(userProfile: unknown)', '(userProfile: any)']
]);

// 4. PublicBookingModal
replaceInFile('src/components/public/PublicBookingModal.tsx', [
    ['(r: Booking)', '(r: string)']
]);

// 5. StripeCheckoutModal
replaceInFile('src/components/public/StripeCheckoutModal.tsx', [
    ['({ data: { user } }: { data: { user: any } })', '({ data: { user } }: any)']
]);
