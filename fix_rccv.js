const fs = require('fs');

let file = fs.readFileSync('src/components/public/RollingCommandCenterView.tsx', 'utf8');

// Fix the import collision
file = file.replace(/import \{ Game, Booking, Profile, Match, Team \} from "@\/types\/index";/g, "import { Game, Booking, Profile } from \"@/types/index\";");

// Fix the .map() typings for local types
// Line 243: .filter((m: Match) => m.id !== newMsg.id) - this should be (m: Message)
file = file.replace(/\.filter\(\(m: Match\) => m\.id !== newMsg\.id\)/g, ".filter((m: Message) => m.id !== newMsg.id)");

// Line 137: matches.filter((m: Match) =>
// Actually, Match here refers to the local StandingsTable Match which was imported on line 20.
// That is fine now since we removed Match from the @/types/index import.

// Fix Player vs Profile in roster mapping.
// Line 343: .map((p: Profile) =>
// Since local type is `Player`, it should be `(p: Player)`.
file = file.replace(/\(p: Profile\) =>/g, "(p: Player) =>");

// Fix `(l: unknown) =>` to `(l: any) =>` or just leave it.

fs.writeFileSync('src/components/public/RollingCommandCenterView.tsx', file);
