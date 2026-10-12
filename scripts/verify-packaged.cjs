const path = require('node:path');
const asar = require('@electron/asar');
const archive = path.resolve(__dirname, '../release/win-unpacked/resources/app.asar');
for (const name of ['dist/index.html', 'server.js', 'desktop/main.cjs', 'desktop/preload.cjs', 'node_modules/electron-updater/package.json']) {
  if (!asar.extractFile(archive, name).length) throw Error('Empty packaged file: ' + name);
}
console.log('PASS: packaged ASAR contains UI, backend, preload, and updater.');
