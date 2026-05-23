const { Project, SyntaxKind } = require("ts-morph");

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
});

const filesToFix = [
    "src/app/admin/(dashboard)/games/[id]/page.tsx",
    "src/app/admin/(dashboard)/settings/page.tsx",
    "src/app/dashboard/billing/page.tsx",
    "src/app/dashboard/page.tsx",
    "src/app/dashboard/schedule/page.tsx",
    "src/app/leaderboard/page.tsx",
    "src/app/profile/page.tsx",
    "src/app/settings/page.tsx",
    "src/components/admin/MatchManager.tsx",
    "src/components/admin/LeagueForm.tsx",
    "src/components/admin/ManualAddPlayerModal.tsx",
    "src/components/admin/PickupForm.tsx",
    "src/components/admin/RollingLeagueForm.tsx",
    "src/components/admin/TournamentForm.tsx",
    "src/components/admin/UserTable.tsx",
    "src/components/public/pickup/PickupCard.tsx",
    "src/components/public/PublicBookingModal.tsx",
    "src/components/public/ReviewModal.tsx",
    "src/components/public/RollingCommandCenterView.tsx",
    "src/components/public/StripeCheckoutModal.tsx",
    "src/components/public/CaptainDashboard.tsx",
    "src/components/JoinGameModal.tsx",
    "src/components/VotingModal.tsx",
    "src/components/calendar/FacilityCalendar.tsx",
    "src/components/ChatInterface.tsx",
    "src/components/facility/operations/OperationsCheckIn.tsx"
];

for (const filePath of filesToFix) {
    const sourceFile = project.getSourceFile(filePath);
    if (!sourceFile) continue;

    let modified = false;

    // Add import if missing
    const hasImport = sourceFile.getImportDeclaration(decl => decl.getModuleSpecifierValue() === "@/types");
    if (!hasImport && sourceFile.getFilePath().includes("src/")) {
        // Calculate relative path to src/types
        sourceFile.addImportDeclaration({
            namedImports: ["Game", "Booking", "Profile", "Match", "Team"],
            moduleSpecifier: "@/types" // Assuming @ maps to src
        });
        modified = true;
    }

    // Fix implicit any parameters in arrow functions (e.g. inside .map)
    const arrowFuncs = sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction);
    for (const arrow of arrowFuncs) {
        const params = arrow.getParameters();
        for (const param of params) {
            if (!param.getTypeNode()) {
                const name = param.getName();
                if (name === "booking" || name === "reg" || name === "r") {
                    param.setType("Booking");
                    modified = true;
                } else if (name === "game" || name === "g") {
                    param.setType("Game");
                    modified = true;
                } else if (name === "user" || name === "u" || name === "p" || name === "profile") {
                    param.setType("Profile");
                    modified = true;
                } else if (name === "team" || name === "t") {
                    param.setType("Team");
                    modified = true;
                } else if (name === "match" || name === "m") {
                    param.setType("Match");
                    modified = true;
                } else if (name === "payload") {
                    param.setType("Record<string, unknown>");
                    modified = true;
                } else if (name === "data") {
                    param.setType("any"); // We will fix 'any' usage later, or type it as unknown
                } else if (name === "v" || name === "s" || name === "c" || name === "w") {
                    param.setType("any");
                }
            }
        }
    }

    // Replace explicit `: any` with `unknown` or specific types
    // Note: User strictly forbade `any`.
    
    // We will find explicit `any` types and remove them.
    const anyTypes = sourceFile.getDescendantsOfKind(SyntaxKind.AnyKeyword);
    for (const anyType of anyTypes) {
        const parent = anyType.getParent();
        if (parent.getKind() === SyntaxKind.TypeReference) continue;
        
        // Contextual replacement
        const grandparent = parent.getParent();
        const text = parent.getText();
        
        if (text.includes("booking") || text.includes("roster")) {
             anyType.replaceWithText("Booking");
        } else if (text.includes("game")) {
             anyType.replaceWithText("Game");
        } else if (text.includes("user")) {
             anyType.replaceWithText("Profile");
        } else if (text.includes("payload")) {
             anyType.replaceWithText("Record<string, unknown>");
        } else {
             anyType.replaceWithText("unknown");
        }
        modified = true;
    }

    if (modified) {
        sourceFile.saveSync();
        console.log(`Patched ${filePath}`);
    }
}
