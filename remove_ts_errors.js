const fs = require('fs');

const files = [
    'src/app/dashboard/page.tsx',
    'src/app/leaderboard/page.tsx',
    'src/app/profile/page.tsx',
    'src/app/settings/page.tsx',
    'src/components/admin/ManualAddPlayerModal.tsx',
    'src/components/admin/MatchManager.tsx',
    'src/components/admin/PickupForm.tsx',
    'src/components/calendar/FacilityCalendar.tsx',
    'src/components/ChatInterface.tsx',
    'src/components/facility/operations/OperationsCheckIn.tsx',
    'src/components/JoinGameModal.tsx',
    'src/components/public/CaptainDashboard.tsx',
    'src/components/public/pickup/PickupCard.tsx',
    'src/components/public/RollingCommandCenterView.tsx'
];

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/\/\/ @ts-expect-error.*\n/g, '');
        fs.writeFileSync(file, content);
    }
}
