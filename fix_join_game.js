const fs = require('fs');

let file = fs.readFileSync('src/components/JoinGameModal.tsx', 'utf8');

// The ast patcher probably changed (u: Profile) to (u: Game) by accident!
// Let's replace 'import { Game, Booking, Profile, Match, Team } from "@/types/index";' with correct ones
file = file.replace(/import \{ Game, Booking, Profile, Match, Team \} from "@\/types\/index";/g, 'import { Profile } from "@/types/index";');

// Revert userProfile type from Game to Profile
// If I did `const userProfile: Game = ...`, I need to fix it.
file = file.replace(/userProfile: Game/g, "userProfile: Profile");
file = file.replace(/const profile: Game/g, "const profile: Profile");
file = file.replace(/const u: Game/g, "const u: Profile");
file = file.replace(/userProfile: Game/g, "userProfile: Profile");

// `err: unknown` -> `err: Error`
file = file.replace(/\(err: unknown\)/g, "(err: Error)");

fs.writeFileSync('src/components/JoinGameModal.tsx', file);
