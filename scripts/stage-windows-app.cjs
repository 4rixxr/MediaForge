const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const app = path.join(root, '.mediaforge-app');
fs.rmSync(app, {recursive:true,force:true});
fs.mkdirSync(app,{recursive:true});
for (const filename of ['dist','desktop','server.js']) {
  const from=path.join(root,filename), to=path.join(app,filename);
  if(!fs.existsSync(from)) throw Error('Missing build asset: '+filename);
  fs.cpSync(from,to,{recursive:true});
}
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const electronPkg=JSON.parse(fs.readFileSync(path.join(root,'node_modules/electron/package.json'),'utf8'));
const config = structuredClone(pkg.build);
config.directories = {output:'../release',app:'.'};
config.files = ['dist/**/*','desktop/**/*','server.js','package.json'];
config.extraResources = [{from:'../vendor/win/bin',to:'bin',filter:['**/*.exe']}];
const runtime = {name:pkg.name,version:pkg.version,description:pkg.description,type:'module',main:'desktop/main.cjs',private:true,build:config};
fs.writeFileSync(path.join(app,'package.json'),JSON.stringify(runtime,null,2)+'\n');
fs.writeFileSync(path.join(root,'.electron-version'), electronPkg.version+'\n');
console.log('Staged minimal app without node_modules:',app);
console.log('Electron version:',electronPkg.version);
