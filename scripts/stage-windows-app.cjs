const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const app = path.join(root, '.mediaforge-app');
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
console.log('Minimal runtime staging created, without build-time node_modules:',app);
