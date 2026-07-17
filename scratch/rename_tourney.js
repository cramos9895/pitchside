const fs = require('fs');
const path = require('path');

const files = [
  'src/components/public/tournaments/TournamentHub.tsx',
  'src/components/public/tournaments/TournamentSalesView.tsx',
  'src/components/public/tournaments/TournamentFreeAgentView.tsx',
  'src/components/public/tournaments/TournamentCommandCenterView.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/RollingLeagueHub/g, 'TournamentHub');
  content = content.replace(/RollingSalesView/g, 'TournamentSalesView');
  content = content.replace(/RollingFreeAgentView/g, 'TournamentFreeAgentView');
  content = content.replace(/RollingCommandCenterView/g, 'TournamentCommandCenterView');
  content = content.replace(/rolling-leagues/g, 'tournaments');
  content = content.replace(/\.\/Rolling/g, './Tournament');
  fs.writeFileSync(file, content);
});
console.log('Done');
