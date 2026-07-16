const fs = require('fs');

const files = [
  'src/components/public/tournaments/TournamentHub.tsx',
  'src/components/public/tournaments/TournamentSalesView.tsx',
  'src/components/public/tournaments/TournamentFreeAgentView.tsx',
  'src/components/public/tournaments/TournamentCommandCenterView.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Fix imports from '.' to '..' for shared components
  content = content.replace(/'\.\/(DraftConfirmationModal|PitchSideConfirmModal|RollingMatchHistory|TournamentMatchHistory)'/g, "'../$1'");
  content = content.replace(/'\.\/tactics/g, "'../tactics");
  content = content.replace(/'\.\/checkin/g, "'../checkin");
  content = content.replace(/'\.\/TournamentMatchHistory'/g, "'../RollingMatchHistory'");
  
  // Re-correct TournamentMatchHistory if it was erroneously renamed
  content = content.replace(/import { RollingMatchHistory } from '\.\.\/TournamentMatchHistory';/, "import { RollingMatchHistory } from '../RollingMatchHistory';");

  fs.writeFileSync(file, content);
});
console.log('Fixed imports');
