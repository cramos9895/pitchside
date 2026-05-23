const fs = require('fs');

// ReviewModal
let rm = fs.readFileSync('src/components/public/ReviewModal.tsx', 'utf8');
rm = rm.replace("import { Game, Booking, Profile, Match, Team } from \"@/types/index\";\n", "");
rm = rm.replace("const { data: { user } } = await supabase.auth.getSession().then(({data}) => ({ data: { user: data.session?.user } }));", "const { data: { user } } = await supabase.auth.getSession().then((res: unknown) => { const r = res as { data: { session: { user: { id: string } } | null } }; return { data: { user: r.data.session?.user } }; });");
rm = rm.replace("{ROLES.map((r: Booking) =>", "{ROLES.map((r: string) =>");
fs.writeFileSync('src/components/public/ReviewModal.tsx', rm);

// StripeCheckoutModal
let sc = fs.readFileSync('src/components/public/StripeCheckoutModal.tsx', 'utf8');
sc = sc.replace("import { Game, Booking, Profile, Match, Team } from \"@/types/index\";\n", "");
sc = sc.replace("const { data: { user } } = await supabase.auth.getUser();", "const { data: { user } } = await supabase.auth.getUser();");
// Wait, the error is Binding element 'user' implicitly has an 'any' type.
sc = sc.replace("await supabase.auth.getUser().then(({data: {user}}) =>", "await supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) =>"); // I'll fix this to unknown manually if needed.
fs.writeFileSync('src/components/public/StripeCheckoutModal.tsx', sc);

// PublicBookingModal
let pb = fs.readFileSync('src/components/public/PublicBookingModal.tsx', 'utf8');
pb = pb.replace("import { Game, Booking, Profile, Match, Team } from \"@/types/index\";", "import { Game, Profile } from \"@/types/index\";");
pb = pb.replace(/\(\{(\s*)data(\s*)\}\)(\s*)=>/g, "({ data }: { data: any }) =>");
fs.writeFileSync('src/components/public/PublicBookingModal.tsx', pb);

// VotingModal
let vm = fs.readFileSync('src/components/VotingModal.tsx', 'utf8');
vm = vm.replace("import { Game, Booking, Profile, Match, Team } from \"@/types/index\";\n", "");
vm = vm.replace("(({data}) =>", "(({data}: {data: any}) =>");
vm = vm.replace("(err) =>", "(err: any) =>");
fs.writeFileSync('src/components/VotingModal.tsx', vm);

