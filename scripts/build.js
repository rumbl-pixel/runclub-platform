const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const deploy = process.argv.includes('--deploy');
const messageIndex = process.argv.indexOf('-m');
const message = messageIndex >= 0 && process.argv[messageIndex + 1]
  ? process.argv[messageIndex + 1]
  : 'Automated build: assemble modules and sync to production';

const copies = [
  ['src/backend/backend.js', 'backend.js'],
  ['src/scanning/scanning.js', 'scanning.js'],
  ['src/data/tracking.js', 'tracking.js'],
  ['src/goals/goals.js', 'goals.js'],
  ['src/goals/admin-goals.js', 'admin-goals.js'],
  ['src/kiosk/kiosk.html', 'kiosk.html'],
  ['src/kiosk/kiosk.js', 'kiosk.js'],
  ['src/kiosk/kiosk.css', 'kiosk.css']
];

function run(cmd, args) {
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });
}

console.log('==> Assembling modules from src/ into deployable root...');
for (const [from, to] of copies) {
  fs.copyFileSync(path.join(root, from), path.join(root, to));
  console.log(`    + ${to}`);
}
console.log('==> Build complete. Root now contains generated module bundles.');

if (!deploy) {
  console.log('==> Skipping deploy. Run with --deploy to commit + push.');
  process.exit(0);
}

console.log('==> Deploying to production (origin/main)...');
run('git', ['add', '-A']);
try {
  execFileSync('git', ['diff', '--cached', '--quiet'], { cwd: root, stdio: 'ignore' });
  console.log('    Nothing to commit - already in sync.');
} catch (_) {
  run('git', ['commit', '-m', message]);
  run('git', ['push', 'origin', 'main']);
  console.log('==> Pushed to origin/main. Production will sync on next Pages/Netlify build.');
}
