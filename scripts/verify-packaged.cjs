const path = require('node:path');
const asar = require('@electron/asar');
const archive = path.resolve(__dirname, '../release/win-unpacked/resources/app.asar');
// ASAR traverses folders with the host path separator. Normalize nested paths
// before extraction so Windows does not treat node_modules/electron-updater as one folder.
for (const name of ['dist/index.html', 'server.js', 'desktop/main.cjs', 'desktop/preload.cjs', 'node_modules/electron-updater/package.json']) {
  if (!asar.extractFile(archive, path.normalize(name)).length) throw Error('Empty packaged file: ' + name);
}
console.log('PASS: packaged ASAR contains UI, backend, preload, and updater.');
