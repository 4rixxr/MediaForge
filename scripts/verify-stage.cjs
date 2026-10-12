const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '../.mediaforge-app');
for (const name of ['dist/index.html', 'server.js', 'desktop/main.cjs', 'desktop/preload.cjs', 'node_modules/electron-updater/package.json']) {
  if (!fs.existsSync(path.join(root, name))) throw Error('Runtime file missing: ' + name);
}
const runtimeRequire = createRequire(path.join(root, 'package.json'));
runtimeRequire('electron-updater');
for (const name of ['electron', 'electron-builder', 'vite', 'typescript']) {
  if (fs.existsSync(path.join(root, 'node_modules', name))) throw Error('Build dependency leaked into runtime: ' + name);
}
console.log('PASS: staged app and electron-updater dependencies are complete.');
