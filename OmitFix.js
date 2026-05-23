const fs = require('fs');

let indexTs = fs.readFileSync('src/types/index.ts', 'utf8');
indexTs = indexTs.replace(
    'export interface GameWithPayments extends Game {',
    'export interface GameWithPayments extends Omit<Game, "cash_amount" | "strict_waiver_required" | "waiver_details" | "payment_collection_type" | "player_registration_fee" | "cash_fee_structure"> {'
);
indexTs = indexTs.replace(
    'export interface ProfileWithUI extends Profile {',
    'export interface ProfileWithUI extends Omit<Profile, "first_name" | "last_name" | "free_game_credits"> {'
);
fs.writeFileSync('src/types/index.ts', indexTs);
