const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const dir of ['dist', 'release', '.mediaforge-app']) {
  fs.rmSync(path.join(root, dir), {recursive: true, force: true});
}
console.log('Generated build directories removed. Source files preserved.');
