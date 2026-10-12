const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const app = path.join(root, '.mediaforge-app');
for (const filename of ['dist/index.html', 'desktop/main.cjs', 'desktop/preload.cjs', 'server.js', 'package-lock.json']) {
  if (!fs.existsSync(path.join(root, filename))) throw Error('Jalankan npm run build terlebih dahulu. Berkas tidak ditemukan: ' + filename);
}
fs.rmSync(app, {recursive:true,force:true});
fs.mkdirSync(app,{recursive:true});
for (const filename of ['dist','desktop','server.js']) {
  const from=path.join(root,filename), to=path.join(app,filename);
  if(!fs.existsSync(from)) throw Error('Hasil build tidak ditemukan: '+filename);
  fs.cpSync(from,to,{recursive:true});
}
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const runtime={name:pkg.name,version:pkg.version,description:pkg.description,
 type:'module',main:'desktop/main.cjs',private:true,dependencies:{'electron-updater':pkg.dependencies['electron-updater']}};
fs.writeFileSync(path.join(app,'package.json'),JSON.stringify(runtime,null,2)+'\n');
// Keep the runtime dependency versions identical to the root npm ci installation.
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
if (lock.lockfileVersion !== 3) throw Error('Expected npm lockfile v3. Run npm install with Node 22.');
const packages = {'': {...runtime}};
for (const [name, entry] of Object.entries(lock.packages)) {
  if (name && !entry.dev && !entry.devOptional) packages[name] = entry;
}
fs.writeFileSync(path.join(app, 'package-lock.json'), JSON.stringify({
  name: runtime.name, version: runtime.version, lockfileVersion: 3, requires: true, packages
}, null, 2) + '\n');
console.log('Minimal runtime staging created, without build-time node_modules:',app);
