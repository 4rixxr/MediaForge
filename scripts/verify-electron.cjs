const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const electron = require('electron');
if (!fs.existsSync(electron)) throw Error('Electron binary missing. Run npm ci without --ignore-scripts.');
const check = spawnSync(electron, ['--version'], {
  encoding: 'utf8', windowsHide: true, env: {...process.env, ELECTRON_RUN_AS_NODE: '1'}
});
if (check.error) throw check.error;
if (check.status !== 0) throw Error('Electron could not start: ' + check.stderr);
console.log('Electron package:', require('electron/package.json').version);
console.log('Electron binary:', electron);
console.log('Embedded Node:', check.stdout.trim());
